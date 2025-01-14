import { ethereum, BigInt, log, Address } from "@graphprotocol/graph-ts";
import {
  Account,
  ActiveEventAccount,
  Market,
  Position,
  PositionSnapshot,
  PositionCounter,
  LendingProtocol,
} from "../generated/schema";
import { Cauldron } from "../generated/templates/Cauldron/Cauldron";
import {
  BIGINT_ZERO,
  EventType,
  InterestRateSide,
  PositionSide,
  SECONDS_PER_DAY,
} from "./common/constants";
import {
  getOrCreateLendingProtocol,
  getOrCreateUsageMetricsDailySnapshot,
} from "./common/getters";
import { addToArrayAtIndex } from "./common/utils/arrays";

export function getOrCreateAccount(accountId: string): Account {
  let account = Account.load(accountId);
  if (!account) {
    account = new Account(accountId);
    account.positionCount = 0;
    account.openPositionCount = 0;
    account.closedPositionCount = 0;
    account.depositCount = 0;
    account.withdrawCount = 0;
    account.borrowCount = 0;
    account.repayCount = 0;
    account.liquidateCount = 0;
    account.liquidationCount = 0;
    account.save();

    const protocol = getOrCreateLendingProtocol();
    protocol.cumulativeUniqueUsers += 1;
    protocol.save();
  }
  return account;
}

export function addAccountToProtocol(
  eventType: string,
  account: Account,
  event: ethereum.Event
): void {
  const protocol = getOrCreateLendingProtocol();
  const dailyId: string = (
    event.block.timestamp.toI64() / SECONDS_PER_DAY
  ).toString();

  const activeEventId = `daily-${account.id}-${dailyId}-${eventType}`;
  let activeEvent = ActiveEventAccount.load(activeEventId);

  const dailySnapshot = getOrCreateUsageMetricsDailySnapshot(event);

  if (eventType == EventType.DEPOSIT) {
    if (protocol.depositors.indexOf(account.id) < 0) {
      protocol.depositors = addToArrayAtIndex(
        protocol.depositors,
        account.id,
        0
      );
      protocol.cumulativeUniqueDepositors += 1;
      dailySnapshot.cumulativeUniqueDepositors =
        protocol.cumulativeUniqueDepositors;
    }
    if (!activeEvent) {
      activeEvent = new ActiveEventAccount(activeEventId);
      dailySnapshot.dailyActiveDepositors += 1;
    }
    dailySnapshot.save();
  } else if (eventType == EventType.BORROW) {
    if (protocol.borrowers.indexOf(account.id) < 0) {
      protocol.borrowers = addToArrayAtIndex(protocol.borrowers, account.id, 0);
      protocol.cumulativeUniqueBorrowers += 1;
      dailySnapshot.cumulativeUniqueBorrowers =
        protocol.cumulativeUniqueBorrowers;
    }
    if (!activeEvent) {
      activeEvent = new ActiveEventAccount(activeEventId);
      dailySnapshot.dailyActiveBorrowers += 1;
    }
    dailySnapshot.save();
  } else if (eventType == EventType.LIQUIDATOR) {
    if (protocol.liquidators.indexOf(account.id) < 0) {
      protocol.liquidators = addToArrayAtIndex(
        protocol.liquidators,
        account.id,
        0
      );
      protocol.cumulativeUniqueLiquidators += 1;
      dailySnapshot.cumulativeUniqueLiquidators =
        protocol.cumulativeUniqueLiquidators;
    }
    if (!activeEvent) {
      activeEvent = new ActiveEventAccount(activeEventId);
      dailySnapshot.dailyActiveLiquidators += 1;
    }
    dailySnapshot.save();
  } else if (eventType == EventType.LIQUIDATEE) {
    if (protocol.liquidatees.indexOf(account.id) < 0) {
      protocol.liquidatees = addToArrayAtIndex(
        protocol.liquidatees,
        account.id,
        0
      );
      protocol.cumulativeUniqueLiquidatees += 1;
      dailySnapshot.cumulativeUniqueLiquidatees =
        protocol.cumulativeUniqueLiquidatees;
    }
    if (!activeEvent) {
      activeEvent = new ActiveEventAccount(activeEventId);
      dailySnapshot.dailyActiveLiquidatees += 1;
    }
    dailySnapshot.save();
  }
  activeEvent!.save();
  protocol.save();
}

export function updatePositions(
  side: string,
  protocol: LendingProtocol,
  market: Market,
  eventType: string,
  accountId: string,
  event: ethereum.Event,
  liquidation: boolean = false
): string {
  const account = getOrCreateAccount(accountId);

  if (
    eventType == EventType.DEPOSIT ||
    eventType == EventType.BORROW ||
    eventType == EventType.LIQUIDATOR ||
    eventType == EventType.LIQUIDATEE
  ) {
    addAccountToProtocol(eventType, account, event);
  }

  const balance = getAccountBalance(
    Address.fromString(market.id),
    Address.fromString(accountId),
    side
  );

  if (eventType == EventType.DEPOSIT || eventType == EventType.BORROW) {
    // add position
    return addPosition(
      protocol,
      market,
      account,
      balance,
      eventType,
      side,
      event
    ).id;
  } else {
    const position = subtractPosition(
      protocol,
      market,
      account,
      balance,
      side,
      eventType,
      event
    );
    if (!position) {
      return "";
    }
    if (liquidation) {
      position.liquidationCount += 1;
      position.save();
    }

    return position.id;
  }
}

// grab an individual accounts balances on a market
function getAccountBalance(
  marketAddress: Address,
  accountAddress: Address,
  positionSide: string
): BigInt {
  const cauldronContract = Cauldron.bind(marketAddress);

  let tryBalance: ethereum.CallResult<BigInt>;
  if (positionSide == InterestRateSide.BORROW) {
    // grab an accounts MIM borrow from a given collateral mkt
    tryBalance = cauldronContract.try_userBorrowPart(accountAddress);
  } else {
    // grab an accounts inputTokenBalance
    tryBalance = cauldronContract.try_userCollateralShare(accountAddress);
  }

  return tryBalance.reverted ? BIGINT_ZERO : tryBalance.value;
}

export function getLiquidatePosition(
  side: string,
  marketId: string,
  accountId: string
): string {
  const positionCounter = PositionCounter.load(
    accountId.concat("-").concat(marketId).concat("-").concat(side)
  );
  if (!positionCounter) {
    log.warning("No liquidation position found for account {} on market {}", [
      accountId,
      marketId,
    ]);
    return "";
  }

  const position = Position.load(
    positionCounter.id.concat("-").concat(positionCounter.nextCount.toString())
  );
  if (!position) {
    log.warning("No liquidation position found for account {} on market {}", [
      accountId,
      marketId,
    ]);
    return "";
  }

  return position.id;
}

// A series of side effects on position added
// They include:
// * Create a new position when needed or reuse the existing position
// * Update position related data in protocol, market, account
// * Take position snapshot
function addPosition(
  protocol: LendingProtocol,
  market: Market,
  account: Account,
  newBalance: BigInt,
  eventType: string,
  side: string,
  event: ethereum.Event
): Position {
  const counterID = account.id
    .concat("-")
    .concat(market.id)
    .concat("-")
    .concat(side);
  let positionCounter = PositionCounter.load(counterID);
  if (!positionCounter) {
    positionCounter = new PositionCounter(counterID);
    positionCounter.nextCount = 0;
    positionCounter.save();
  }
  const positionID = positionCounter.id
    .concat("-")
    .concat(positionCounter.nextCount.toString());

  let position = Position.load(positionID);
  const openPosition = position == null;
  if (!openPosition) {
    position = position!;
    position.balance = newBalance;
    if (eventType == EventType.DEPOSIT) {
      position.depositCount += 1;
    } else if (eventType == EventType.BORROW) {
      position.borrowCount += 1;
    }
    position.save();

    snapshotPosition(position, event);
    return position;
  }

  // open a new position
  position = new Position(positionID);
  position.account = account.id;
  position.market = market.id;
  position.hashOpened = event.transaction.hash.toHexString();
  position.blockNumberOpened = event.block.number;
  position.timestampOpened = event.block.timestamp;
  position.side = side;
  if (side == PositionSide.LENDER) {
    position.isCollateral = market.canUseAsCollateral;
  }
  position.balance = newBalance;
  position.depositCount = 0;
  position.withdrawCount = 0;
  position.borrowCount = 0;
  position.repayCount = 0;
  position.liquidationCount = 0;
  if (eventType == EventType.DEPOSIT) {
    position.depositCount += 1;
  } else if (eventType == EventType.BORROW) {
    position.borrowCount += 1;
  }
  position.save();

  //
  // update account position
  //
  account.positionCount += 1;
  account.openPositionCount += 1;
  account.save();

  //
  // update market position
  //
  market.positionCount += 1;
  market.openPositionCount += 1;

  if (eventType == EventType.DEPOSIT) {
    market.lendingPositionCount += 1;
  } else if (eventType == EventType.BORROW) {
    market.borrowingPositionCount += 1;
  }
  market.save();

  //
  // update protocol position
  //
  protocol.cumulativePositionCount += 1;
  protocol.openPositionCount += 1;
  protocol.save();

  //
  // take position snapshot
  //
  snapshotPosition(position, event);

  return position;
}

// A series of side effects on position subtracted
// They include:
// * Close a position when needed or reuse the exisitng position
// * Update position related data in protocol, market, account
// * Take position snapshot
function subtractPosition(
  protocol: LendingProtocol,
  market: Market,
  account: Account,
  newBalance: BigInt,
  side: string,
  eventType: string,
  event: ethereum.Event
): Position | null {
  const counterID = account.id
    .concat("-")
    .concat(market.id)
    .concat("-")
    .concat(side);
  const positionCounter = PositionCounter.load(counterID);
  if (!positionCounter) {
    log.warning("[subtractPosition] position counter {} not found", [
      counterID,
    ]);
    return null;
  }
  const positionID = positionCounter.id
    .concat("-")
    .concat(positionCounter.nextCount.toString());
  const position = Position.load(positionID);
  if (!position) {
    log.warning("[subtractPosition] position {} not found", [positionID]);
    return null;
  }
  position.balance = newBalance;
  if (eventType == EventType.WITHDRAW) {
    position.withdrawCount += 1;
  } else if (eventType == EventType.REPAY) {
    position.repayCount += 1;
  }
  position.save();

  const closePosition = position.balance == BIGINT_ZERO;
  if (closePosition) {
    //
    // update position counter
    //
    positionCounter.nextCount += 1;
    positionCounter.save();

    //
    // close position
    //
    position.hashClosed = event.transaction.hash.toHexString();
    position.blockNumberClosed = event.block.number;
    position.timestampClosed = event.block.timestamp;
    position.save();

    //
    // update account position
    //
    account.openPositionCount -= 1;
    account.closedPositionCount += 1;
    account.save();

    //
    // update market position
    //
    market.openPositionCount -= 1;
    market.closedPositionCount += 1;
    market.save();

    //
    // update protocol position
    //
    protocol.openPositionCount -= 1;
    protocol.save();
  }

  //
  // update position snapshot
  //
  snapshotPosition(position, event);

  return position;
}

function snapshotPosition(position: Position, event: ethereum.Event): void {
  const snapshot = new PositionSnapshot(
    position.id
      .concat("-")
      .concat(event.transaction.hash.toHexString())
      .concat("-")
      .concat(event.logIndex.toString())
  );
  snapshot.hash = event.transaction.hash.toHexString();
  snapshot.logIndex = event.logIndex.toI32();
  snapshot.nonce = event.transaction.nonce;
  snapshot.position = position.id;
  snapshot.balance = position.balance;
  snapshot.blockNumber = event.block.number;
  snapshot.timestamp = event.block.timestamp;
  snapshot.save();
}

import { Address, ethereum, log } from "@graphprotocol/graph-ts";
import {
  Alchemist,
  ActiveVaultUpdated,
  EmergencyExitUpdated,
  FundsFlushed,
  FundsHarvested,
  FundsRecalled,
  HarvestFeeUpdated,
  RewardsUpdated,
  TokensDeposited,
  TokensLiquidated,
  TokensRepaid,
  TokensWithdrawn,
  TransmuterUpdated,
} from "../../generated/Alchemist/Alchemist";
import { YearnVaultAdapter } from "../../generated/templates/VaultAdapter/YearnVaultAdapter";
import { ERC20 } from "../../generated/templates/VaultAdapter/ERC20";
import { protocolConfig } from "../common/constants";
import { Vault, YieldAggregator } from "../sdk/protocol";
import { getAlchemistCurrentVault, setAlchemistVault } from "../storage/aux";
import { BIGINT_ZERO, VaultFeeType } from "../sdk/constants";

// function initToken(address: Address): Token {
//   let token = Token.load(address.toHexString());
//   if (token) {
//     return token;
//   }

//   let sc = ERC20.bind(address);
//   token = new Token(address.toHexString());
//   token.name = sc.name();
//   token.symbol = sc.symbol();
//   token.decimals = sc.decimals();
//   token.lastPriceUSD = BIGDECIMAL_ZERO; // todo
//   token.lastPriceBlockNumber = BIGINT_ZERO;

//   token.save();
//   return token;
// }

export function handleActiveVaultUpdated(event: ActiveVaultUpdated): void {
  const protocol = YieldAggregator.load(protocolConfig, event);
  protocol.loadVault(event.params.adapter.toHexString(), onCreateVault);
}

export function handleFundsFlushed(event: FundsFlushed): void {
  const protocol = YieldAggregator.load(protocolConfig, event);
  protocol.addPool();
  // update vault tvl
}

export function handleFundsHarvested(event: FundsHarvested): void {
  const protocol = YieldAggregator.load(protocolConfig, event);
  protocol.addPool();
  // update financials?
  // update fees
}

export function handleFundsRecalled(event: FundsRecalled): void {
  const protocol = YieldAggregator.load(protocolConfig, event);
  protocol.addPool();
  // think about this. update tvl from vault?
}

export function handleHarvestFeeUpdated(event: HarvestFeeUpdated): void {
  const protocol = YieldAggregator.load(protocolConfig, event);
  const vaultID = getAlchemistCurrentVault(event.address);
  if (!vaultID) {
  }
  // update fee on all vaults from this alchemist
}

export function handleRewardsUpdated(event: RewardsUpdated): void {
  const protocol = YieldAggregator.load(protocolConfig, event);
  protocol.addPool();
}

export function handleTokensDeposited(event: TokensDeposited): void {
  // add deposit, add account, update tvl
  const protocol = YieldAggregator.load(protocolConfig, event);
  protocol.addPool();

  const vaultID = getAlchemistCurrentVault(event.address)!;
  const vault = protocol.loadVault(vaultID);
  //vault.deposit();
}

function onCreateVault(wrapper: Vault, event: TokensDeposited): void {
  const alchemist = Alchemist.bind(event.address);

  // calculate fee
  const resolution = alchemist.PERCENT_RESOLUTION().toBigDecimal();
  const feeVal = alchemist.harvestFee().toBigDecimal();
  const feePercentage = feeVal.div(resolution);

  // get token and vault name and symbol
  const vaultSC = YearnVaultAdapter.bind(Address.fromString(wrapper.vault.id));
  const depositToken = vaultSC.token();
  const yieldToken = vaultSC.vault();
  const yieldTokenSC = ERC20.bind(yieldToken);
  const name = `Alchemix V1 ${yieldTokenSC.name()}`;
  const symbol = yieldTokenSC.symbol();
  const limit = BIGINT_ZERO;

  wrapper.initialize(name, symbol, limit, depositToken, yieldToken);
  wrapper.setFee(VaultFeeType.PERFORMANCE_FEE, feePercentage);

  setAlchemistVault(event.address, Address.fromString(wrapper.vault.id));
}

export function handleTokensLiquidated(event: TokensLiquidated): void {
  const protocol = YieldAggregator.load(protocolConfig, event);
  protocol.addPool();
  // doesnt do anything because no funds enter or leave the protocol.
  // maybe create some event to track it?
}

export function handleTokensRepaid(event: TokensRepaid): void {
  const protocol = YieldAggregator.load(protocolConfig, event);
  protocol.addPool();
  // if token is not the synthetic, then add to tvl (as a deposit?)
}

export function handleTokensWithdrawn(event: TokensWithdrawn): void {
  const protocol = YieldAggregator.load(protocolConfig, event);
  protocol.addPool();
  // add withdrawal, add account, update tvl
}

export function handleTransmuterUpdated(event: TransmuterUpdated): void {
  const protocol = YieldAggregator.load(protocolConfig, event);
  protocol.addPool();
}

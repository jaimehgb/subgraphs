import { Address } from "@graphprotocol/graph-ts";
import { Account } from "../../../generated/schema";

export class Accounts {
  public static storeAccount(account: Address): boolean {
    let acc = Account.load(account.toHexString());
    if (acc) {
      return true;
    }

    acc = new Account(account.toHexString());
    acc.save();
    return false;
  }
}

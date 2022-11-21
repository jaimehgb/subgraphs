import { Address } from "@graphprotocol/graph-ts";

import { ERC20 } from "../../../generated/templates/VaultAdapter/ERC20";

import { Token } from "../../../generated/schema";

export class Tokens {
  static initToken(address: Address): Token {
    let token = Token.load(address.toHexString());
    if (token) {
      return token;
    }

    const sc = ERC20.bind(address);
    token = new Token(address.toHexString());
    token.name = sc.name();
    token.symbol = sc.symbol();
    token.decimals = sc.decimals();
    token.save();
    return token;
  }
}

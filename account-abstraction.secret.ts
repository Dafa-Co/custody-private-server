import { join } from 'path';
import * as fs from 'fs';
import { InternalServerErrorException } from '@nestjs/common';
import { supportedNetworks } from 'rox-custody_common-modules/blockchain/global-commons/supported-networks.enum';
import { isDefined } from 'class-validator';

const keysPath = join(process.cwd(), 'account-secrets.json'); // Adjust the path as needed
const keysData = JSON.parse(fs.readFileSync(keysPath, 'utf8'));

interface accountAbstractionSecrets {
  v2Bundler: {
    mainnet: string;
    testnet: string;
  };
  v3Bundler: {
    [network: string]: string;
  };
  v1Paymaster: {
    [network: string]: string;
  };
  v2Paymaster: {
    [network: string]: string;
  };
}

const returnSecret = (type: secretsTypes, key: string) => {
  const secret = keysData[type][key];

  if(!isDefined(secret) || secret === '') {
    throw new InternalServerErrorException(`Secret not found for ${type} and key ${key}`);
  }

  return secret;
};

export enum secretsTypes {
  v2Bundler = 'v2Bundler',
  v3Bundler = 'v3Bundler',
  v1Paymaster = 'v1Paymaster',
  v2Paymaster = 'v2Paymaster',
}

export const ACCOUNT_ABSTRACTION_SECRETS: accountAbstractionSecrets = {
  v2Bundler: {
    mainnet: returnSecret(secretsTypes.v2Bundler, 'mainnet'),
    testnet: returnSecret(secretsTypes.v2Bundler, 'testnet'),
  },
  v3Bundler: {},
  v1Paymaster: {},
  v2Paymaster: {},
};

const EVM_NETWORK_IDS = [
    supportedNetworks.Ethereum,
    supportedNetworks.Polygon,
    supportedNetworks.BSC,
    supportedNetworks.Arbitrum_One,
    supportedNetworks.Optimism,
    supportedNetworks.Avalanche,
    supportedNetworks.Base,
    supportedNetworks.Mantle,
    supportedNetworks.Blast,
    supportedNetworks.Scroll,
    supportedNetworks.Gnosis,
    supportedNetworks.sepolia,
    supportedNetworks.baseSepolia,
];

const fillAccountAbstractionSecrets = (type: secretsTypes) => {
  for (const value of EVM_NETWORK_IDS) {
    ACCOUNT_ABSTRACTION_SECRETS[type][value] = returnSecret(type, value.toString());
  }
}

fillAccountAbstractionSecrets(secretsTypes.v3Bundler);
fillAccountAbstractionSecrets(secretsTypes.v1Paymaster);
fillAccountAbstractionSecrets(secretsTypes.v2Paymaster);

export const throwOrReturn = (type: secretsTypes, key: string): string => {
  if (!isDefined(ACCOUNT_ABSTRACTION_SECRETS[type][key]) || ACCOUNT_ABSTRACTION_SECRETS[type][key] === '') {
    throw new InternalServerErrorException(`Secret is not loaded for ${type} and key ${key}`);
  }

  return ACCOUNT_ABSTRACTION_SECRETS[type][key];
};

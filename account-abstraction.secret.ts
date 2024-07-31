import { join } from 'path';
import { supportedNetworks } from 'utils/enums/supported-networks.enum';
import * as fs from 'fs';
import { InternalServerErrorException } from '@nestjs/common';

const keysPath = join(process.cwd(), 'src/../', 'account-secrets.json'); // Adjust the path as needed
const keysData = JSON.parse(fs.readFileSync(keysPath, 'utf8'));

interface accountAbstractionSecrets {
  bundler: {
    mainnet: string;
    testnet: string;
  };
  paymaster: {
    [network: string]: string;
  };
}

const returnSecret = (type: secretsTypes, key: string) => {
  return keysData[type][key];
};

export enum secretsTypes {
  bundler = 'bundler',
  paymaster = 'paymaster',
}

const ACCOUNT_ABSTRACTION_SECRETS: accountAbstractionSecrets = {
  bundler: {
    mainnet: returnSecret(secretsTypes.bundler, 'mainnet'),
    testnet: returnSecret(secretsTypes.bundler, 'testnet'),
  },
  paymaster: {},
};

export const throwOrReturn = (type: secretsTypes, key: string) => {
  if (!ACCOUNT_ABSTRACTION_SECRETS[type][key]) {
    const error = `Secret not found for ${type} and key ${key}`;
    throw new InternalServerErrorException(error);
  }

  return ACCOUNT_ABSTRACTION_SECRETS[type][key];
};

const supportedNetworkValues = Object.values(supportedNetworks).filter(
  (value) => typeof value === 'number',
);

for (const value of supportedNetworkValues) {
  ACCOUNT_ABSTRACTION_SECRETS.paymaster[value] = returnSecret(
    secretsTypes.paymaster,
    value.toString(),
  );
}

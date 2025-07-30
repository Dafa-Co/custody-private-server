import { supportedNetworks } from "rox-custody_common-modules/blockchain/global-commons/supported-networks.enum";
import { HexString } from "rox-custody_common-modules/libs/types/hex-string.type";

export const NEXUS_IMPLEMENTATION_ADDRESS = "0x0000000025a29E0598c88955fd00E256691A089c";
export const NEXUS_BOOTSTRAP_ADDRESS = "0x000000001aafD7ED3B8baf9f46cD592690A5BBE5";
export const ENTRYPOINT_ADDRESS_V6 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" as HexString;
export const ENTRYPOINT_ADDRESS_V7 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as HexString;

export const NEXUS_SUPPORTED_NETWORK_IDS = [
    supportedNetworks.Ethereum,
    supportedNetworks.Polygon,
    supportedNetworks.BSC,
    supportedNetworks.Arbitrum_One,
    supportedNetworks.Optimism,
    supportedNetworks.Base,
    supportedNetworks.Blast,
    supportedNetworks.Scroll,
    supportedNetworks.Gnosis,
    supportedNetworks.baseSepolia,
];
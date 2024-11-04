import { BadRequestException } from '@nestjs/common';
import {
  arbitrum,
  arbitrumNova,
  astar,
  avalanche,
  base,
  blast,
  bsc,
  chiliz,
  coreDao,
  gnosis,
  linea,
  mainnet,
  manta,
  mantle,
  optimism,
  opBNB,
  polygon,
  polygonZkEvm,
  polygonZkEvmCardona,
  scroll,
  zetachain,
  Chain,
  acala,
  ancient8,
  ancient8Sepolia,
  anvil,
  apexTestnet,
  arbitrumGoerli,
  astarZkEVM,
  astarZkyoto,
  arbitrumSepolia,
  areonNetwork,
  areonNetworkTestnet,
  artelaTestnet,
  aurora,
  auroraTestnet,
  auroria,
  avalancheFuji,
  bahamut,
  baseGoerli,
  baseSepolia,
  beam,
  beamTestnet,
  bearNetworkChainMainnet,
  bearNetworkChainTestnet,
  berachainTestnet,
  berachainTestnetbArtio,
  bevmMainnet,
  bitkub,
  bitkubTestnet,
  bitTorrent,
  bitTorrentTestnet,
  blastSepolia,
  bob,
  boba,
  bronos,
  bronosTestnet,
  bscTestnet,
  bscGreenfield,
  btr,
  btrTestnet,
  bxn,
  bxnTestnet,
  canto,
  celo,
  celoAlfajores,
  classic,
  confluxESpace,
  confluxESpaceTestnet,
  crab,
  cronos,
  cronosTestnet,
  crossbell,
  cyber,
  cyberTestnet,
  darwinia,
  dchain,
  dchainTestnet,
  defichainEvm,
  defichainEvmTestnet,
  degen,
  dfk,
  dodochainTestnet,
  dogechain,
  dreyerxMainnet,
  dreyerxTestnet,
  edgeless,
  edgelessTestnet,
  edgeware,
  edgewareTestnet,
  eon,
  eos,
  eosTestnet,
  etherlink,
  etherlinkTestnet,
  evmos,
  evmosTestnet,
  ekta,
  ektaTestnet,
  fantom,
  fantomSonicTestnet,
  fantomTestnet,
  fibo,
  filecoin,
  filecoinCalibration,
  filecoinHyperspace,
  flare,
  flareTestnet,
  flowPreviewnet,
  flowMainnet,
  flowTestnet,
  foundry,
  fraxtal,
  fraxtalTestnet,
  funkiSepolia,
  fuse,
  fuseSparknet,
  iotex,
  iotexTestnet,
  jbc,
  jbcTestnet,
  karura,
  gobi,
  goerli,
  gnosisChiado,
  ham,
  hardhat,
  harmonyOne,
  haqqMainnet,
  haqqTestedge2,
  hedera,
  hederaTestnet,
  hederaPreviewnet,
  holesky,
  immutableZkEvm,
  immutableZkEvmTestnet,
  inEVM,
  kakarotSepolia,
  kava,
  kavaTestnet,
  kcc,
  klaytn,
  klaytnBaobab,
  koi,
  kroma,
  kromaSepolia,
  l3x,
  l3xTestnet,
  lightlinkPegasus,
  lightlinkPhoenix,
  lineaGoerli,
  lineaSepolia,
  lineaTestnet,
  lisk,
  liskSepolia,
  localhost,
  lukso,
  luksoTestnet,
  lycan,
  lyra,
  mandala,
  mantaSepoliaTestnet,
  mantaTestnet,
  mantleSepoliaTestnet,
  mantleTestnet,
  merlin,
  metachain,
  metachainIstanbul,
  metalL2,
  meter,
  meterTestnet,
  metis,
  metisGoerli,
  mev,
  mevTestnet,
  mintSepoliaTestnet,
  mode,
  modeTestnet,
  moonbaseAlpha,
  moonbeam,
  moonbeamDev,
  moonriver,
  morphHolesky,
  morphSepolia,
  nautilus,
  neonDevnet,
  neonMainnet,
  nexi,
  nexilix,
  oasys,
  oasisTestnet,
  okc,
  optimismGoerli,
  optimismSepolia,
  opBNBTestnet,
  oortMainnetDev,
  otimDevnet,
  palm,
  palmTestnet,
  playfiAlbireo,
  pgn,
  pgnTestnet,
  phoenix,
  plinga,
  plumeTestnet,
  polygonAmoy,
  polygonMumbai,
  polygonZkEvmTestnet,
  pulsechain,
  pulsechainV4,
  qMainnet,
  qTestnet,
  real,
  redbellyTestnet,
  redstone,
  reyaNetwork,
  rollux,
  rolluxTestnet,
  ronin,
  rootstock,
  rootstockTestnet,
  rss3,
  rss3Sepolia,
  saigon,
  sapphire,
  sapphireTestnet,
  satoshiVM,
  satoshiVMTestnet,
  scrollSepolia,
  sei,
  seiDevnet,
  seiTestnet,
  sepolia,
  shimmer,
  shimmerTestnet,
  skaleBlockBrawlers,
  skaleCalypso,
  skaleCalypsoTestnet,
  skaleCryptoBlades,
  skaleCryptoColosseum,
  skaleEuropa,
  skaleEuropaTestnet,
  skaleExorde,
  skaleHumanProtocol,
  skaleNebula,
  skaleNebulaTestnet,
  skaleRazor,
  skaleTitan,
  skaleTitanTestnet,
  songbird,
  songbirdTestnet,
  shardeumSphinx,
  shibarium,
  shibariumTestnet,
  stratis,
  syscoin,
  syscoinTestnet,
  taraxa,
  taiko,
  taikoHekla,
  taikoJolnir,
  taikoKatla,
  taikoTestnetSepolia,
  taraxaTestnet,
  telcoinTestnet,
  telos,
  telosTestnet,
  tenet,
  thaiChain,
  thunderTestnet,
  unreal,
  vechain,
  wanchain,
  wanchainTestnet,
  wemix,
  wemixTestnet,
  xLayerTestnet,
  xLayer,
  xai,
  xaiTestnet,
  xdc,
  xdcTestnet,
  xrSepolia,
  yooldoVerse,
  yooldoVerseTestnet,
  zetachainAthensTestnet,
  zhejiang,
  zilliqa,
  zilliqaTestnet,
  zkFair,
  zkFairTestnet,
  zkLinkNova,
  zkLinkNovaSepoliaTestnet,
  zkSync,
  zkSyncInMemoryNode,
  zkSyncLocalNode,
  zkSyncSepoliaTestnet,
  zora,
  zoraSepolia,
  zoraTestnet,
  zircuitTestnet,
} from 'viem/chains';


export enum NetworkCategory {
  EVM = 0,
  BitCoin,
  Solana,
  steller,
  Tron
}

export enum supportedNetworks {
  // biconomy with viem  mainnet
  Ethereum,
  Polygon,
  BSC,
  Polygon_zkEVM,
  Arbitrum_One,
  Arbitrum_Nova,
  Optimism,
  Avalanche,
  Base,
  Linea,
  Chiliz,
  Astar,
  opBNB,
  Manta,
  Core,
  Mantle,
  Blast,
  Scroll,
  Zetachain,
  Polygon_zkEVM_Cardona,
  Gnosis,

  // biconomy with viem testnet

    // etherem testnet
    goerli,
    sepolia,

    // polygon testnet
    polygonAmoy,
    polygonMumbai,

    // BSC testnet
    bscTestnet,

    // Polygon_zkEVM testnet
    PolygonZkEvmTestnet,

    // Arbitrum_One testnet
    arbitrumGoerli,
    arbitrumSepolia,


    // Arbitrum_Nova testnet
    // Optimism testnet
    optimismGoerli,
    optimismSepolia,


    // Avalanche testnet
    avalancheFuji,

    // Base testnet
    BaseGoerli,
    BaseSepolia,


    // Linea testnet
    LineaGoerli,
    LineaSepolia,
    lineaTestnet,

    // Chiliz testnet
    spicy,

    // Astar testnet
    astarZkEVM,
    astarZkyoto,

    // opBNB testnet
    opBNBTestnet,

    // Manta testnet
    MantaSepoliaTestnet,
    mantaTestnet,

    // Core testnet


    // Mantle testnet
    MantleSepoliaTestnet,
    mantleTestnet,

    // Blast testnet
    blastSepolia,



    // Scroll testnet
    ScrollSepolia,


    // Zetachain testnet
    ZetachainAthensTestnet,


    // Polygon_zkEVM_Cardona testnet
    // Gnosis testnet
    gnosisChiado,

  // biconomy without viem
  Combo,
  Zeroone,
  Bera,
  Gold,
  Degenchain,
  Olive,
  X_Layer,

  // other networks with gas
  bitcoin,
  steller,
  terra,
  tron,
  polkadot,
  ripple,
  solana,


  // viem with gas
  acala,
  ancient8,
  ancient8Sepolia,
  anvil,
  apexTestnet,
  areonNetwork,
  areonNetworkTestnet,
  artelaTestnet,
  aurora,
  auroraTestnet,
  auroria,
  bahamut,
  beam,
  beamTestnet,
  bearNetworkChainMainnet,
  bearNetworkChainTestnet,
  berachainTestnet,
  berachainTestnetbArtio,
  bevmMainnet,
  bitkub,
  bitkubTestnet,
  bitTorrent,
  bitTorrentTestnet,
  bob,
  boba,
  bronos,
  bronosTestnet,
  bscGreenfield,
  btr,
  btrTestnet,
  bxn,
  bxnTestnet,
  canto,
  celo,
  celoAlfajores,
  classic,
  confluxESpace,
  confluxESpaceTestnet,
  crab,
  cronos,
  cronosTestnet,
  crossbell,
  cyber,
  cyberTestnet,
  darwinia,
  dchain,
  dchainTestnet,
  defichainEvm,
  defichainEvmTestnet,
  degen,
  dfk,
  dodochainTestnet,
  dogechain,
  dreyerxMainnet,
  dreyerxTestnet,
  edgeless,
  edgelessTestnet,
  edgeware,
  edgewareTestnet,
  eon,
  eos,
  eosTestnet,
  etherlink,
  etherlinkTestnet,
  evmos,
  evmosTestnet,
  ekta,
  ektaTestnet,
  fantom,
  fantomSonicTestnet,
  fantomTestnet,
  fibo,
  filecoin,
  filecoinCalibration,
  filecoinHyperspace,
  flare,
  flareTestnet,
  flowPreviewnet,
  flowMainnet,
  flowTestnet,
  foundry,
  fraxtal,
  fraxtalTestnet,
  funkiSepolia,
  fuse,
  fuseSparknet,
  iotex,
  iotexTestnet,
  jbc,
  jbcTestnet,
  karura,
  gobi,
  ham,
  hardhat,
  harmonyOne,
  haqqMainnet,
  haqqTestedge2,
  hedera,
  hederaTestnet,
  hederaPreviewnet,
  holesky,
  immutableZkEvm,
  immutableZkEvmTestnet,
  inEVM,
  kakarotSepolia,
  kava,
  kavaTestnet,
  kcc,
  klaytn,
  klaytnBaobab,
  koi,
  kroma,
  kromaSepolia,
  l3x,
  l3xTestnet,
  lightlinkPegasus,
  lightlinkPhoenix,
  lisk,
  liskSepolia,
  localhost,
  lukso,
  luksoTestnet,
  lycan,
  lyra,
  mandala,
  merlin,
  metachain,
  metachainIstanbul,
  metalL2,
  meter,
  meterTestnet,
  metis,
  metisGoerli,
  mev,
  mevTestnet,
  mintSepoliaTestnet,
  mode,
  modeTestnet,
  moonbaseAlpha,
  moonbeam,
  moonbeamDev,
  moonriver,
  morphHolesky,
  morphSepolia,
  nautilus,
  neonDevnet,
  neonMainnet,
  nexi,
  nexilix,
  oasys,
  oasisTestnet,
  okc,
  oortMainnetDev,
  otimDevnet,
  palm,
  palmTestnet,
  playfiAlbireo,
  pgn,
  pgnTestnet,
  phoenix,
  plinga,
  plumeTestnet,
  pulsechain,
  pulsechainV4,
  qMainnet,
  qTestnet,
  real,
  redbellyTestnet,
  redstone,
  reyaNetwork,
  rollux,
  rolluxTestnet,
  ronin,
  rootstock,
  rootstockTestnet,
  rss3,
  rss3Sepolia,
  saigon,
  sapphire,
  sapphireTestnet,
  satoshiVM,
  satoshiVMTestnet,
  sei,
  seiDevnet,
  seiTestnet,
  shimmer,
  shimmerTestnet,
  skaleBlockBrawlers,
  skaleCalypso,
  skaleCalypsoTestnet,
  skaleCryptoBlades,
  skaleCryptoColosseum,
  skaleEuropa,
  skaleEuropaTestnet,
  skaleExorde,
  skaleHumanProtocol,
  skaleNebula,
  skaleNebulaTestnet,
  skaleRazor,
  skaleTitan,
  skaleTitanTestnet,
  songbird,
  songbirdTestnet,
  shardeumSphinx,
  shibarium,
  shibariumTestnet,
  stratis,
  syscoin,
  syscoinTestnet,
  taraxa,
  taiko,
  taikoHekla,
  taikoJolnir,
  taikoKatla,
  taikoTestnetSepolia,
  taraxaTestnet,
  telcoinTestnet,
  telos,
  telosTestnet,
  tenet,
  thaiChain,
  thunderTestnet,
  unreal,
  vechain,
  wanchain,
  wanchainTestnet,
  wemix,
  wemixTestnet,
  xLayerTestnet,
  xLayer,
  xai,
  xaiTestnet,
  xdc,
  xdcTestnet,
  xrSepolia,
  yooldoVerse,
  yooldoVerseTestnet,
  zhejiang,
  zilliqa,
  zilliqaTestnet,
  zkFair,
  zkFairTestnet,
  zkLinkNova,
  zkLinkNovaSepoliaTestnet,
  zkSync,
  zkSyncInMemoryNode,
  zkSyncLocalNode,
  zkSyncSepoliaTestnet,
  zora,
  zoraSepolia,
  zoraTestnet,
  zircuitTestnet,


  // bitcoin testnet
  bitcoinTestnet,

  // tron testnet
  shastaTestnet,
  nileTestnet
}

export enum GasNetworkType {
  gasless,
  withGas,
}

export enum gaslessLibrary {
  AccountAbstraction,
  Tron
}

export enum withGasLibrary {
  erc20,
  bitcoin,
  stellar,
  terra,
  tron,
  polkadot,
  ripple,
  solana,
  view,
}

export interface networkData {
  chain: Chain;
  type: GasNetworkType;
  library?: gaslessLibrary | withGasLibrary;
  isTest: boolean;
  category: NetworkCategory;
}

export const getChainFromNetwork = (
  network: supportedNetworks,
): networkData => {

  let chain = biconomyWithChainMainnet(network);
  if (chain) {
    return chain;
  }

  chain = withGasChainMainnet(network);
  if (chain) {
    return chain;
  }

  chain = biconomyWithChainTestNet(network);
  if (chain) {
    return chain;
  }
  chain = getTronChain(network);
  if(chain) {
    return chain;
  }
};

export const biconomyWithChainMainnet = (
  network: supportedNetworks,
): networkData => {

  switch (network) {
        // biconomy with viem main net
        case supportedNetworks.Ethereum:
          return {
            chain: mainnet,
            type: GasNetworkType.gasless,
            library: gaslessLibrary.AccountAbstraction,
            isTest: false,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Polygon:
          return {
            chain: polygon,
            type: GasNetworkType.gasless,
            library: gaslessLibrary.AccountAbstraction,
            isTest: false,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.BSC:
          return {
            chain: bsc,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Polygon_zkEVM:
          return {
            chain: polygonZkEvm,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Arbitrum_One:
          return {
            chain: arbitrum,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Arbitrum_Nova:
          return {
            chain: arbitrumNova,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Optimism:
          return {
            chain: optimism as Chain,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Avalanche:
          return {
            chain: avalanche,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Base:
          return {
            chain: base as Chain,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Linea:
          return {
            chain: linea,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Chiliz:
          return {
            chain: chiliz,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Astar:
          return {
            chain: astar,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.opBNB:
          return {
            chain: opBNB,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Manta:
          return {
            chain: manta,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Core:
          return {
            chain: coreDao,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Combo:
          throw new BadRequestException('This network is not supported');
        case supportedNetworks.Mantle:
          return {
            chain: mantle,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Blast:
          return {
            chain: blast,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Zeroone:
          throw new BadRequestException('This network is not supported');
        case supportedNetworks.Scroll:
          return {
            chain: scroll,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Bera:
          throw new BadRequestException('This network is not supported');
        case supportedNetworks.Zetachain:
          return {
            chain: zetachain,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Gold:
          throw new BadRequestException('This network is not supported');

        case supportedNetworks.Degenchain:
          throw new BadRequestException('This network is not supported');
        case supportedNetworks.Olive:
          throw new BadRequestException('This network is not supported');
        case supportedNetworks.Polygon_zkEVM_Cardona:
          return {
            chain: polygonZkEvmCardona,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.Gnosis:
          return {
            chain: gnosis,
            type: GasNetworkType.gasless,
            isTest: false,
            library: gaslessLibrary.AccountAbstraction,
            category: NetworkCategory.EVM,
          };
        case supportedNetworks.X_Layer:
          throw new BadRequestException('This network is not supported');
  }
  return null;
};

export const withGasChainMainnet = (
  network: supportedNetworks,
): networkData => {

  switch (network) {
    case supportedNetworks.bitcoin:
      return {
        chain: null,
        isTest: false,
        type: GasNetworkType.withGas,
        library: withGasLibrary.bitcoin,
        category: NetworkCategory.BitCoin,
      };
    case supportedNetworks.bitcoinTestnet:
        return {
          chain: null,
          isTest: true,
          type: GasNetworkType.withGas,
          library: withGasLibrary.bitcoin,
          category: NetworkCategory.BitCoin,
        };

    case supportedNetworks.steller:
      return {
        chain: null,
        isTest: false,
        type: GasNetworkType.withGas,
        library: withGasLibrary.stellar,
        category: NetworkCategory.steller,
      };
    case supportedNetworks.terra:
      return {
        chain: null,
        isTest: false,
        type: GasNetworkType.withGas,
        library: withGasLibrary.terra,
        category: NetworkCategory.EVM,
      };
    case supportedNetworks.polkadot:
      return {
        chain: null,
        isTest: false,
        type: GasNetworkType.withGas,
        library: withGasLibrary.polkadot,
        category: null,
      };
    case supportedNetworks.ripple:
      return {
        chain: null,
        isTest: false,
        type: GasNetworkType.withGas,
        library: withGasLibrary.ripple,
        category: null,
      };
    case supportedNetworks.solana:
      return {
        chain: null,
        isTest: false,
        type: GasNetworkType.withGas,
        library: withGasLibrary.solana,
        category: null,
      };
  }

  return null;
}




export const biconomyWithChainTestNet = (
  network: supportedNetworks,
): networkData => {

  switch (network) {

  // biconomy with viem  testnet

    // etherem testnet
    case supportedNetworks.goerli:
      return {
        chain: goerli,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };
    case supportedNetworks.sepolia:
      return {
        chain: sepolia,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    // polygon testnet
    case supportedNetworks.polygonAmoy:
      return {
        chain: polygonAmoy,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };


    case supportedNetworks.polygonMumbai:
      return {
        chain: polygonMumbai,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    // BSC testnet
    case supportedNetworks.bscTestnet:
      return {
        chain: bscTestnet,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    // Polygon_zkEVM testnet
    case supportedNetworks.PolygonZkEvmTestnet:
      return {
        chain: polygonZkEvmTestnet,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    // Arbitrum_One testnet
    case supportedNetworks.arbitrumGoerli:
      return {
        chain: arbitrumGoerli,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };


    case supportedNetworks.arbitrumSepolia:
      return {
        chain: arbitrumSepolia,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };


    // Arbitrum_Nova testnet
    // Optimism testnet
    case supportedNetworks.optimismGoerli:
      return {
        chain: optimismGoerli as Chain,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };
    case supportedNetworks.optimismSepolia:
      return {
        chain: optimismSepolia as Chain,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };


    // Avalanche testnet
    case supportedNetworks.avalancheFuji:
      return {
        chain: avalancheFuji,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    // Base testnet
    case supportedNetworks.BaseGoerli:
      return {
        chain: baseGoerli as Chain,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      }


    case supportedNetworks.BaseSepolia:
      return {
        chain: baseSepolia as Chain,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      }


    // Linea testnet
    case supportedNetworks.LineaGoerli:
      return {
        chain: lineaGoerli,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      }



    case supportedNetworks.LineaSepolia:
      return {
        chain: lineaSepolia,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      }


    case supportedNetworks.lineaTestnet:
      return {
        chain: lineaTestnet,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      }

    // Chiliz testnet
    case supportedNetworks.spicy:
      return {
        chain: chiliz,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    // Astar testnet
    case supportedNetworks.astarZkEVM:
      return {
        chain: astarZkEVM,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    case supportedNetworks.astarZkyoto:
      return {
        chain: astarZkyoto,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    // opBNB testnet
    case supportedNetworks.opBNBTestnet:
      return {
        chain: opBNBTestnet,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    // Manta testnet
    case supportedNetworks.MantaSepoliaTestnet:
      return {
        chain: mantaSepoliaTestnet,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };


    case supportedNetworks.mantaTestnet:
      return {
        chain: mantaTestnet,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    // Core testnet
    // Mantle testnet
    case supportedNetworks.MantleSepoliaTestnet:
      return {
        chain: mantleSepoliaTestnet,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    case supportedNetworks.mantleTestnet:
      return {
        chain: mantleTestnet,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    // Blast testnet
    case supportedNetworks.blastSepolia:
      return {
        chain: blastSepolia,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };


    // Scroll testnet
    case supportedNetworks.ScrollSepolia:
      return {
        chain: scrollSepolia,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };


    // Zetachain testnet
    case supportedNetworks.ZetachainAthensTestnet:
      return {
        chain: zetachainAthensTestnet,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

    // Polygon_zkEVM_Cardona testnet
    // Gnosis testnet
    case supportedNetworks.gnosisChiado:
      return {
        chain: gnosisChiado,
        type: GasNetworkType.gasless,
        library: gaslessLibrary.AccountAbstraction,
        isTest: true,
        category: NetworkCategory.EVM,
      };

  }



  return null;
};

const tronChain: Chain = {
  name: "Tron",
  nativeCurrency: {
    name: "Tron",
    symbol: "TRX",
    decimals: 6,
  },
  blockExplorers: {
    default: {
      name: "Tronscan",
      url: "https://tronscan.org",
    }
  },
  id: 1,
  rpcUrls: {
    default: {
      http: [],
      webSocket: []
    }
  }
}

const tronTestnetShastaChain: Chain = {
  ...tronChain,
  blockExplorers: {
    default: {
      ...tronChain.blockExplorers.default,
      url: "https://shasta.tronscan.org/"
    },
  },
}

const tronTestnetNileChain: Chain = {
  ...tronChain,
  blockExplorers: {
    default: {
      ...tronChain.blockExplorers.default,
      url: "https://nile.tronscan.org/"
    },
  },
}

export const getTronChain = (
  network: supportedNetworks,
): networkData => {

  switch (network) {
    case supportedNetworks.tron:
      return {
        chain: tronChain,
        isTest: false,
        type: GasNetworkType.gasless,
        category: NetworkCategory.Tron,
        library: gaslessLibrary.Tron,
      };

    case supportedNetworks.shastaTestnet:
      return {
        chain: tronTestnetShastaChain,
        isTest: true,
        type: GasNetworkType.gasless,
        category: NetworkCategory.Tron,
        library: gaslessLibrary.Tron,
      };

    case supportedNetworks.nileTestnet:
    return {
      chain: tronTestnetNileChain,
      isTest: true,
      type: GasNetworkType.gasless,
      category: NetworkCategory.Tron,
      library: gaslessLibrary.Tron,
    };
  }

  return null;
}
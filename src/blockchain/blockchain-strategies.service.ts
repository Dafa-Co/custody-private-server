import { InternalServerErrorException } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { IBlockChainPrivateServer } from "src/blockchain/interfaces/blockchain.interface";
import { AssetEntity } from "src/common/entities/asset.entity";
import { NetworkEntity } from "src/common/entities/network.entity";
import { TransientService } from "utils/decorators/transient.decorator";
import { gaslessLibrary, netowkrsTypes, getChainFromNetwork, withGasLibrary } from "utils/enums/supported-networks.enum";
import { BitcoinStrategyService } from "./different-networks/bitcoin-strategy.service";
import { AccountAbstractionStrategyService } from "./different-networks/account-abstraction-strategy.service";

@TransientService()
export class BlockchainFactoriesService {
    private asset: AssetEntity;
    private network: NetworkEntity;
    private strategy: IBlockChainPrivateServer;


    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly bitcoinStrategyService: BitcoinStrategyService,
        private readonly accountAbstractionStrategyService: AccountAbstractionStrategyService
    ) {}

    async getStrategy(asset: AssetEntity, network: NetworkEntity): Promise<IBlockChainPrivateServer> {
        this.asset = asset;
        this.network = network;

        const { networkId } = network;


        console.log("networkId", network);

        const chain = getChainFromNetwork(networkId);

        console.log("chain", chain)

        const { library, type } = chain;

        switch (type) {
          case netowkrsTypes.withGas:
            this.strategy = await this.getWithGasNetworkLibrary(
              library as unknown as withGasLibrary,
            );
          case netowkrsTypes.gasless:
            this.strategy = await this.getGaslessNetworkLibrary(library as gaslessLibrary);
        }


        if(!this.strategy) {
          throw new Error("wallet library not exist")
        }

        await this.strategy.init({
            asset,
            network
        })

        return this.strategy
    }

    private async getWithGasNetworkLibrary(
        library: withGasLibrary,
      ): Promise<IBlockChainPrivateServer> {
        switch (library) {
          case withGasLibrary.bitcoin:
            return this.bitcoinStrategyService;
        }
      }

      private async getGaslessNetworkLibrary(
        library: gaslessLibrary,
      ): Promise<IBlockChainPrivateServer> {
        switch (library) {
          case gaslessLibrary.AccountAbstraction:
            return this.accountAbstractionStrategyService;
        }
      }


}

import {
    Chain,
    Hex,
    PublicClient,
    createPublicClient,
    erc20Abi,
    http,
    maxUint256,
    encodeFunctionData,
    concat,
    numberToHex,
    size
} from 'viem';
import * as EVM_CHAINS from 'viem/chains';

export class EvmHelper {
    /**
     * Create a viem public client for a specific network
     */
    public static createPublicClient(chain: Chain) {
        return createPublicClient({
            chain,
            transport: http(chain.rpcUrls.default.http[0]),
        });
    }

    /**
     * Get the chain configuration for a specific network
     */
    public static getChainConfig(network: string): Chain {
        const chain = EVM_CHAINS[network as keyof typeof EVM_CHAINS];
        if (!chain) {
            throw new Error(`Chain ${network} is not supported`);
        }
        return chain;
    }

    /**
     * Get an ERC20 token contract instance
     */
    public static getTokenContract(tokenAddress: string, publicClient: PublicClient) {
        return {
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            client: publicClient
        };
    }

    /**
     * Get the decimals for an ERC20 token
     */
    public static async getTokenDecimals(tokenAddress: string, publicClient: PublicClient): Promise<number> {
        try {
            const decimals = await publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'decimals'
            });
            return Number(decimals);
        } catch (error) {
            console.error('Error fetching token decimals:', error);
            return 18; // Default to 18 as a fallback for most ERC20 tokens
        }
    }

    /**
     * Check if a token is a native token (ETH, MATIC, etc.)
     */
    public static isNativeToken(tokenAddress: string): boolean {
        // Common representations of native tokens across different platforms
        const nativeAddresses = [
            '0x0000000000000000000000000000000000000000',
            '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            'ETH',
            'NATIVE'
        ];

        return nativeAddresses.some(addr =>
            addr.toLowerCase() === tokenAddress.toLowerCase()
        );
    }

    /**
     * Get the ERC20 token allowance for a specific spender
     */
    public static async getTokenAllowance(
        tokenAddress: string,
        ownerAddress: string,
        spenderAddress: string,
        publicClient: PublicClient
    ): Promise<bigint> {
        try {
            const allowance = await publicClient.readContract({
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: 'allowance',
                args: [
                    ownerAddress as `0x${string}`,
                    spenderAddress as `0x${string}`
                ]
            });
            return allowance;
        } catch (error) {
            console.error('Error fetching token allowance:', error);
            throw new Error(`Failed to get token allowance: ${error}`);
        }
    }

    /**
     * Prepare the transaction data for an ERC20 allowance approval
     */
    public static prepareAllowanceTransaction(
        tokenAddress: string,
        spenderAddress: string
    ): Hex {
        // Encode the approve function call with maximum uint256 value
        const data = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [spenderAddress as `0x${string}`, maxUint256]
        });

        return data;
    }

    /**
     * Convert a number to a hexadecimal string with specific formatting
     */
    public static numberToHex(value: number, options?: {
        size?: number;
        signed?: boolean;
    }): Hex {
        return numberToHex(value, {
            signed: options?.signed || false,
            size: options?.size || 32
        });
    }

    /**
     * Concatenate multiple hex strings
     */
    public static concatHex(hexValues: Hex[]): Hex {
        return concat(hexValues);
    }

    /**
     * Get the size of a hex string in bytes
     */
    public static getHexSize(hex: Hex): number {
        return size(hex);
    }

    /**
     * Get the block explorer URL for a transaction
     */
    public static getExplorerUrl(txHash: string, chain: Chain): string {
        const explorer = chain.blockExplorers?.default.url;
        if (!explorer) {
            return '';
        }
        return `${explorer}/tx/${txHash}`;
    }

    /**
     * Get the ERC20 ABI
     */
    public static getErc20Abi() {
        return erc20Abi;
    }
}
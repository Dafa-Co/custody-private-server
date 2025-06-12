import {
    Hex,
    concat,
    numberToHex,
} from 'viem';

export class EvmHelper {
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
}
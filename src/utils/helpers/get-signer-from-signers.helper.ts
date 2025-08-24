import { BadRequestException } from "@nestjs/common";
import { SignerTypeEnum } from "rox-custody_common-modules/libs/enums/signer-type.enum";
import { IPrivateKeyFilledTransactionSigner } from "rox-custody_common-modules/libs/interfaces/sign-transaction.interface";

export function getSignerFromSigners(signers: Partial<IPrivateKeyFilledTransactionSigner>[], type: SignerTypeEnum, required: boolean = false) {
    const signer = signers.find((s) => s.type === type);

    if (required && !signer) {
        throw new BadRequestException(`Signer of type ${type} is required`);
    }

    return signer;
}
import { MigrationInterface, QueryRunner } from "typeorm";

export class KeyForEachCorporate1731849475873 implements MigrationInterface {
    name = 'KeyForEachCorporate1731849475873'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`corporate_key_entity\` (\`corporateId\` int NOT NULL, \`privateKey\` text NOT NULL, \`publicKey\` text NOT NULL, \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`corporateId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`private_key_nonce\` CHANGE \`nonce\` \`nonce\` int UNSIGNED NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`private_key_nonce\` CHANGE \`nonce\` \`nonce\` int UNSIGNED NOT NULL DEFAULT '1'`);
        await queryRunner.query(`DROP TABLE \`corporate_key_entity\``);
    }

}

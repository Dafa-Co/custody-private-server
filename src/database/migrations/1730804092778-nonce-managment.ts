import { MigrationInterface, QueryRunner } from "typeorm";

export class NonceManagment1730804092778 implements MigrationInterface {
    name = 'NonceManagment1730804092778'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`private_key_nonce\` (\`id\` int NOT NULL AUTO_INCREMENT, \`private_key_id\` int NOT NULL, \`networkId\` int NOT NULL, \`nonce\` int UNSIGNED NOT NULL DEFAULT '1', UNIQUE INDEX \`IDX_97900cb58a3731447210740fe4\` (\`private_key_id\`, \`networkId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`private_key_nonce\` ADD CONSTRAINT \`FK_8fdfba0b5e6ffe5b5d2ef5bbd98\` FOREIGN KEY (\`private_key_id\`) REFERENCES \`private_keys\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`private_key_nonce\` DROP FOREIGN KEY \`FK_8fdfba0b5e6ffe5b5d2ef5bbd98\``);
        await queryRunner.query(`DROP INDEX \`IDX_97900cb58a3731447210740fe4\` ON \`private_key_nonce\``);
        await queryRunner.query(`DROP TABLE \`private_key_nonce\``);
    }

}

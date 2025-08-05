import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPrivateKeyVersion1764278310475 implements MigrationInterface {
    name = 'AddPrivateKeyVersion1764278310475'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`private_key_version\` (\`privateKeyId\` int NOT NULL, \`version\` tinyint NOT NULL DEFAULT '0', PRIMARY KEY (\`privateKeyId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`private_key_version\` ADD CONSTRAINT \`FK_ac621367fd783c1be284597a94f\` FOREIGN KEY (\`privateKeyId\`) REFERENCES \`private_keys\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`private_key_version\` DROP FOREIGN KEY \`FK_ac621367fd783c1be284597a94f\``);
        await queryRunner.query(`DROP TABLE \`private_key_version\``);
    }

}

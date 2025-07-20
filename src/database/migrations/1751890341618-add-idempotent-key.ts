import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIdempotentKey1751890341618 implements MigrationInterface {
    name = 'AddIdempotentKey1751890341618'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`idempotent_key_entity\` (\`idempotentKey\` varchar(255) NOT NULL, \`keyId\` int NULL, \`address\` varchar(255) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`REL_f3f38f77919f13b90c982fbfa0\` (\`keyId\`), PRIMARY KEY (\`idempotentKey\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`idempotent_key_entity\` ADD CONSTRAINT \`FK_f3f38f77919f13b90c982fbfa02\` FOREIGN KEY (\`keyId\`) REFERENCES \`private_keys\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`idempotent_key_entity\` DROP FOREIGN KEY \`FK_f3f38f77919f13b90c982fbfa02\``);
        await queryRunner.query(`DROP INDEX \`REL_f3f38f77919f13b90c982fbfa0\` ON \`idempotent_key_entity\``);
        await queryRunner.query(`DROP TABLE \`idempotent_key_entity\``);
    }

}

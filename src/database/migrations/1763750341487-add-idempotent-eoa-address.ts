import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIdempotentEOAAddress1763750341487 implements MigrationInterface {
    name = 'AddIdempotentEOAAddress1763750341487'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`idempotent_key_entity\` ADD \`eoaAddress\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`idempotent_key_entity\` DROP COLUMN \`eoaAddress\``);
    }

}

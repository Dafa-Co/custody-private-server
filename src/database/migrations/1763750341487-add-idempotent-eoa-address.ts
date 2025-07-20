import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIdempotentKey1751890341618 implements MigrationInterface {
    name = 'AddIdempotentKey1751890341618'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`idempotent_key_entity\` ADD \`eoaAddress\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`idempotent_key_entity\` DROP COLUMN \`eoaAddress\``);
    }

}

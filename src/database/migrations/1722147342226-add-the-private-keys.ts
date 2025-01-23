import { MigrationInterface, QueryRunner } from "typeorm";

export class AddThePrivateKeys1722147342226 implements MigrationInterface {
    name = 'AddThePrivateKeys1722147342226'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`private_keys\` (\`id\` int NOT NULL AUTO_INCREMENT, \`private_key\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`private_keys\``);
    }

}

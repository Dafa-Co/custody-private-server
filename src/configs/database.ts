import configs from '../utils/configs/configs';
import { DataSource, DataSourceOptions } from 'typeorm';

export const ormConfigs: DataSourceOptions = {
  type: 'mysql',
  synchronize: false,
  supportBigNumbers: true,
  host: configs.DATABASE_HOST,
  username: configs.DATABASE_USER,
  password: configs.DATABASE_PASSWORD,
  database: configs.DATABASE_NAME,
  port: +configs.DATABASE_PORT,
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  migrations: [`${__dirname}/../**/migrations/*{.ts,.js}`],
  migrationsTableName: 'migrations',
  migrationsRun: true,
  charset: 'utf8mb4',
};

const dataSource = new DataSource(ormConfigs);
export default dataSource;

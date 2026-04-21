process.env.DATABASE_URL = 'postgresql://postgres:cmupgaSaRsSsSurrSNvtiLXibQDUYqJX@shinkansen.proxy.rlwy.net:42194/railway';
const {execSync} = require('child_process');
execSync('npx prisma db push', {stdio: 'inherit', env: {...process.env}});
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const del = await prisma.product.deleteMany({
    where: { name: { contains: 'Test' } }
  });
  console.log('Successfully deleted test products:', del.count);
  await prisma.$disconnect();
}
run().catch(console.error);

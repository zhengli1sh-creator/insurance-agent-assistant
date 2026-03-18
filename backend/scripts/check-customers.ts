import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const count = await prisma.customer.count()
    console.log(`数据库中共有 ${count} 条客户记录`)
    
    if (count > 0) {
      const customers = await prisma.customer.findMany({
        take: 10,
        orderBy: { created_at: 'desc' }
      })
      console.log('\n最近导入的客户：')
      customers.forEach((c, i) => {
        console.log(`${i + 1}. ${c.name} (昵称: ${c.nickname || '无'}) - 创建于 ${c.created_at}`)
      })
    }
  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

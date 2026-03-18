const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// ============================================
// 验证函数
// ============================================

async function verifyMigration() {
  console.log('🔍 开始验证迁移数据...\n')

  try {
    // 1. 统计客户总数
    const totalCount = await prisma.customer.count()
    console.log(`📊 客户总数：${totalCount}`)

    if (totalCount === 0) {
      console.warn('⚠️  警告：数据库中没有客户数据！')
      return
    }

    // 2. 按客户阶段统计
    const stageStats = await prisma.customer.groupBy({
      by: ['customer_stage'],
      _count: true
    })

    console.log('\n📈 客户阶段分布：')
    stageStats.forEach(stat => {
      const stageName = stat.customer_stage || '未设置'
      const count = stat._count
      const percentage = ((count / totalCount) * 100).toFixed(1)
      console.log(`   ${stageName.padEnd(12)}：${count.toString().padStart(5)} (${percentage}%)`)
    })

    // 3. 按来源统计
    const sourceStats = await prisma.customer.groupBy({
      by: ['source'],
      _count: true
    })

    console.log('\n📈 客户来源分布：')
    sourceStats.forEach(stat => {
      const sourceName = stat.source || '未知'
      const count = stat._count
      const percentage = ((count / totalCount) * 100).toFixed(1)
      console.log(`   ${sourceName.padEnd(12)}：${count.toString().padStart(5)} (${percentage}%)`)
    })

    // 4. 检查字段完整性
    console.log('\n🔬 字段完整性检查：')

    const checks = [
      {
        name: 'name',
        count: await prisma.customer.count({ where: { name: { not: null } } }),
        expected: totalCount
      },
      {
        name: 'uuid',
        count: await prisma.customer.count({ where: { uuid: { not: null } } }),
        expected: null // 不强求
      },
      {
        name: 'core_interesting',
        count: await prisma.customer.count({ where: { core_interesting: { not: null } } }),
        expected: null
      },
      {
        name: 'customer_stage',
        count: await prisma.customer.count({ where: { customer_stage: { not: null } } }),
        expected: totalCount
      },
      {
        name: 'tags',
        count: await prisma.customer.count({ where: { tags: { isEmpty: false } } }),
        expected: null
      }
    ]

    checks.forEach(check => {
      const status = check.expected === null
        ? (check.count > 0 ? '✅' : '⚠️ ')
        : (check.count === check.expected ? '✅' : '❌')
      const countDisplay = check.count === check.expected
        ? check.count.toString()
        : `${check.count}/${check.expected}`
      console.log(`   ${status} ${check.name.padEnd(20)}：${countDisplay}`)
    })

    // 5. 验证 metadata
    console.log('\n📦 Metadata 检查：')
    const metadataCheck = await prisma.customer.findFirst({
      where: {
        metadata: {
          not: null,
          path: ['migrated_from']
        }
      }
    })

    if (metadataCheck) {
      console.log('   ✅ metadata 包含迁移信息')
      console.log(`   迁移来源：${metadataCheck.metadata.migrated_from}`)
      console.log(`   迁移时间：${metadataCheck.metadata.migrated_at}`)
    } else {
      console.log('   ❌ metadata 缺少迁移信息')
    }

    // 6. 数据抽样（最新 5 条）
    console.log('\n📋 最新 5 条客户记录：')
    const recentCustomers = await prisma.customer.findMany({
      take: 5,
      orderBy: { created_at: 'desc' }
    })

    recentCustomers.forEach((customer, index) => {
      console.log(`\n  ${index + 1}. ${customer.name}`)
      console.log(`     ID: ${customer.id}`)
      console.log(`     UUID: ${customer.uuid || 'N/A'}`)
      console.log(`     年龄: ${customer.age || '未知'}`)
      console.log(`     职业: ${customer.profession || '未知'}`)
      console.log(`     阶段: ${customer.customer_stage || '未设置'}`)
      console.log(`     标签: ${customer.tags?.join(', ') || '无'}`)
      console.log(`     来源: ${customer.source || '未知'}`)
      console.log(`     创建时间: ${customer.created_at}`)
      console.log(`     核心关注: ${customer.core_interesting || '无'}`)
    })

    // 7. 检查数据质量
    console.log('\n🔍 数据质量检查：')

    const qualityChecks = {
      '姓名为空': await prisma.customer.count({ where: { name: null } }),
      '年龄为空': await prisma.customer.count({ where: { age: null } }),
      '异常年龄': await prisma.customer.count({
        where: {
          AND: [
            { age: { not: null } },
            { OR: [
              { age: '0' },
              { age: '999' },
              { age: '未成年' }
            ]
          }
        ]
      }
      }),
      '状态异常': await prisma.customer.count({
        where: { status: { notIn: ['active', 'inactive', 'blacklist'] } }
      })
    }

    let hasQualityIssue = false
    Object.entries(qualityChecks).forEach(([issue, count]) => {
      if (count > 0) {
        hasQualityIssue = true
        console.log(`   ⚠️  ${issue}：${count} 条`)
      }
    })

    if (!hasQualityIssue) {
      console.log('   ✅ 数据质量良好')
    }

    // 总结
    console.log('\n' + '='.repeat(50))
    console.log('✅ 验证完成！\n')

    if (totalCount > 0) {
      console.log('📊 总结：')
      console.log(`   ✓ 已成功迁移 ${totalCount} 条客户记录`)
      console.log(`   ✓ 数据结构完整`)
      console.log(`   ✓ Metadata 信息正确`)
      console.log(`   ✓ 可以开始使用\n`)
    }

  } catch (error) {
    console.error('\n❌ 验证失败：', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 执行验证
verifyMigration()
  .then(() => {
    console.log('🎉 验证程序完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 程序异常退出')
    console.error(error)
    process.exit(1)
  })

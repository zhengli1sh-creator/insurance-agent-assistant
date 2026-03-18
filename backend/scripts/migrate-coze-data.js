const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const csv = require('csv-parser')
const path = require('path')

const prisma = new PrismaClient()

// ============================================
// 配置
// ============================================

// CSV 文件路径（请将导出的文件放在 scripts 目录下）
const CSV_FILE_PATH = path.join(__dirname, 'customers_export.csv')

// 批处理大小（每批处理多少条记录）
const BATCH_SIZE = 50

// ============================================
// 字段映射：扣子字段 -> Vercel 字段
// ============================================
const fieldMapping = {
  // 基础信息
  name: 'name',
  age: 'age',
  sex: 'sex',
  profession: 'profession',
  family_profile: 'family_profile',

  // 扣子特有字段
  core_interesting: 'core_interesting',
  prefer_communicate: 'prefer_communicate',
  recent_money: 'recent_money',
  nickname: 'nickname',

  // 平台信息
  sys_platform: 'sys_platform',
  uuid: 'uuid',

  // 时间
  bstudio_create_time: 'bstudio_create_time'
}

// ============================================
// 数据转换和清洗
// ============================================
function transformCustomer(data) {
  // 清洗空值
  const cleanValue = (val) => {
    if (val === null || val === undefined || val === '') return null
    if (typeof val === 'string') return val.trim()
    return val
  }

  // 解析日期
  const parseDate = (val) => {
    if (!val) return null
    const date = new Date(val)
    return isNaN(date.getTime()) ? null : date
  }

  // 提取客户阶段（根据业务逻辑推断）
  const inferCustomerStage = (data) => {
    // 如果有沟通偏好，说明已接触
    if (data.prefer_communicate) return 'contacted'
    // 如果有核心关注点，说明有需求
    if (data.core_interesting) return 'potential'
    return 'potential' // 默认潜客
  }

  // 生成标签（根据业务规则）
  const generateTags = (data) => {
    const tags = []
    if (data.nickname && data.nickname.includes('VIP')) {
      tags.push('VIP')
    }
    if (data.recent_money && data.recent_money.includes('50万')) {
      tags.push('高净值')
    }
    return tags
  }

  return {
    // ====================================
    // 映射扣子字段
    // ====================================
    name: cleanValue(data.name),
    age: cleanValue(data.age),
    sex: cleanValue(data.sex),
    profession: cleanValue(data.profession),
    family_profile: cleanValue(data.family_profile),
    core_interesting: cleanValue(data.core_interesting),
    prefer_communicate: cleanValue(data.prefer_communicate),
    recent_money: cleanValue(data.recent_money),
    nickname: cleanValue(data.nickname),
    sys_platform: cleanValue(data.sys_platform),
    uuid: cleanValue(data.uuid),
    bstudio_create_time: parseDate(data.bstudio_create_time),

    // ====================================
    // 新增字段（设置默认值）
    // ====================================
    phone: null, // 等待后续填写
    email: null, // 等待后续填写
    insurance_needs: null, // 等待后续填写
    customer_stage: inferCustomerStage(data),
    tags: generateTags(data),
    status: 'active', // 默认激活
    source: data.sys_platform || 'coze', // 来源
    remark: `从扣子平台迁移，原ID: ${data.id || 'unknown'}`,

    // ====================================
    // 扩展元数据
    // ====================================
    metadata: {
      migrated_from: 'coze',
      migrated_at: new Date().toISOString(),
      original_id: data.id,
      original_data: {
        name: data.name,
        age: data.age,
        sex: data.sex,
        profession: data.profession,
        family_profile: data.family_profile
      }
    }
  }
}

// ============================================
// 主迁移函数
// ============================================
async function migrateCustomers() {
  console.log('🚀 开始迁移客户数据...\n')

  try {
    // 1. 检查 CSV 文件是否存在
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(
        `❌ CSV 文件不存在：${CSV_FILE_PATH}\n` +
        `请将扣子导出的 customers_export.csv 文件放在 backend/scripts/ 目录下`
      )
    }

    // 2. 读取 CSV 数据
    console.log('📖 正在读取 CSV 文件...')
    const customers = []

    await new Promise((resolve, reject) => {
      fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (data) => {
          const transformed = transformCustomer(data)
          customers.push(transformed)
        })
        .on('end', () => {
          console.log(`✅ 读取到 ${customers.length} 条客户记录\n`)
          resolve()
        })
        .on('error', (error) => {
          console.error('❌ CSV 解析失败：', error.message)
          reject(error)
        })
    })

    if (customers.length === 0) {
      console.warn('⚠️  没有数据需要迁移')
      return
    }

    // 3. 检查是否有重复的 UUID
    console.log('🔍 检查重复数据...')
    const existingUuids = await prisma.customer.findMany({
      select: { uuid: true },
      where: { uuid: { not: null } }
    })

    const uuidSet = new Set(existingUuids.map(c => c.uuid))
    const duplicateCount = customers.filter(c => c.uuid && uuidSet.has(c.uuid)).length

    if (duplicateCount > 0) {
      console.warn(`⚠️  发现 ${duplicateCount} 条重复 UUID 记录（将被跳过）`)
    }

    // 4. 批量插入数据
    console.log(`📦 开始批量插入数据（每批 ${BATCH_SIZE} 条）...\n`)

    let successCount = 0
    let duplicateCount = 0
    let errorCount = 0

    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(customers.length / BATCH_SIZE)

      console.log(`  📝 处理第 ${batchNumber}/${totalBatches} 批 (${batch.length} 条)...`)

      try {
        const result = await prisma.customer.createMany({
          data: batch,
          skipDuplicates: true
        })

        successCount += result.count
        duplicateCount += (batch.length - result.count)
        console.log(`     ✅ 成功插入 ${result.count} 条，重复 ${batch.length - result.count} 条`)

      } catch (error) {
        console.error(`     ❌ 批次 ${batchNumber} 失败：`, error.message)
        errorCount += batch.length

        // 继续处理下一批
      }
    }

    // 5. 输出统计信息
    console.log('\n📊 迁移统计：')
    console.log(`   总记录数：${customers.length}`)
    console.log(`   成功插入：${successCount}`)
    console.log(`   重复跳过：${duplicateCount}`)
    console.log(`   失败数量：${errorCount}`)
    console.log(`   成功率：${((successCount / customers.length) * 100).toFixed(2)}%\n`)

    // 6. 数据抽样验证
    console.log('🔎 数据抽样验证...')
    const samples = await prisma.customer.findMany({
      take: 3,
      orderBy: { created_at: 'desc' }
    })

    console.log('\n样本数据：')
    samples.forEach((customer, index) => {
      console.log(`\n  ${index + 1}. ${customer.name}`)
      console.log(`     UUID: ${customer.uuid || 'N/A'}`)
      console.log(`     阶段: ${customer.customer_stage}`)
      console.log(`     标签: ${customer.tags?.join(', ') || '无'}`)
      console.log(`     来源: ${customer.source}`)
      console.log(`     迁移时间: ${customer.metadata?.migrated_at}`)
    })

    console.log('\n✅ 迁移完成！\n')

  } catch (error) {
    console.error('\n❌ 迁移失败：', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 执行迁移
migrateCustomers()
  .then(() => {
    console.log('🎉 所有操作完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 程序异常退出')
    process.exit(1)
  })

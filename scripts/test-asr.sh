#!/bin/bash
# ASR 转写测试脚本
# 使用方法: 修改下方的配置参数后运行 ./test-asr.sh

# ============ 配置区域 ============

# 录音文件 URL（从分享链接获取）
AUDIO_URL="https://minio.aisoil.fun/api/v1/download-shared-object/aHR0cDovLzEyNy4wLjAuMTo5MDAxL2FpbW8vdGVzdDEubTRhP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9MFZYN0dFMVREUERXTEVXTDIwVEclMkYyMDI2MDIyMCUyRmNuLWJlaWppbmclMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwMjIwVDEyNDczN1omWC1BbXotRXhwaXJlcz00MzE5OSZYLUFtei1TZWN1cml0eS1Ub2tlbj1leUpoYkdjaU9pSklVelV4TWlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaFkyTmxjM05MWlhraU9pSXdWbGczUjBVeFZFUlFSRmRNUlZkTU1qQlVSeUlzSW1WNGNDSTZNVGMzTVRZd05URTRPU3dpY0dGeVpXNTBJam9pZUdsdGFXNW5JbjAuc2lzVGMxRldNMFhNNGRYR29SU1lFVFpYV0x1NzJzdGdIcEtTMGFNU20taG8xckNKQ0xKcmJXaktxNEFyS3hFRUtyUTJEeEFpS0RTZlhDSEdoWDVJX3cmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0JnZlcnNpb25JZD1udWxsJlgtQW16LVNpZ25hdHVyZT0zYzMwODFmZGQ5YWMzNTk4YTQ0ZDQxMzU4NjY1YTRjMmNkMmExYjM4MmRiMGE3NTY4ZDI0NjAzYWYwNDU5ZDQy"

# 后端地址
API_BASE="http://localhost:3000"

# 认证 Token（从浏览器登录后获取，或通过登录接口获取）
AUTH_TOKEN=""

# ============ 脚本主体 ============

set -e

echo "=== ASR 转写测试 ==="
echo ""

# 检查配置
if [ -z "$AUDIO_URL" ]; then
    echo "❌ 请先配置 AUDIO_URL 录音文件URL"
    exit 1
fi

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ 请先配置 AUTH_TOKEN 认证Token"
    echo "   方式1: 登录后从浏览器获取 Cookie"
    echo "   方式2: 使用登录接口获取（见下方注释）"
    exit 1
fi

# 检查音频文件是否可访问
echo "📥 检查录音文件是否可访问..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$AUDIO_URL")
if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ 录音文件不可访问，HTTP状态码: $HTTP_CODE"
    exit 1
fi
echo "✅ 录音文件可访问"

# 检查文件格式
echo "📄 检查文件格式..."
FILE_TYPE=$(curl -s -r 0-10 "$AUDIO_URL" | xxd | head -1)
if echo "$FILE_TYPE" | grep -q "66747970"; then
    echo "✅ 文件格式: MP4/M4A"
elif echo "$FILE_TYPE" | grep -q "494433"; then
    echo "✅ 文件格式: MP3"
elif echo "$FILE_TYPE" | grep -q "425a68"; then
    echo "✅ 文件格式: BZ2"
else
    echo "⚠️  无法识别的文件格式"
fi

echo ""
echo "=== 方式1: 同步转写（推荐）==="
echo "📝 提交转写请求..."

RESPONSE=$(curl -s -X POST "$API_BASE/api/v1/asr/transcribe-and-wait" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "{\"fileUrls\": [\"$AUDIO_URL\"]}")

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# 检查是否成功
CODE=$(echo "$RESPONSE" | python3 -c "import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('code', ''))
except Exception:
    print('')" 2>/dev/null)
STATUS=$(echo "$RESPONSE" | python3 -c "import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('data', {}).get('status', ''))
except Exception:
    print('')" 2>/dev/null)

if [ "$CODE" = "0" ] && [ "$STATUS" = "SUCCEEDED" ]; then
    echo ""
    echo "✅ 转写成功！"
    # 提取文本内容
    TEXT=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('results',[{}])[0].get('transcripts',[{}])[0].get('text',''))" 2>/dev/null || echo "")
    if [ -n "$TEXT" ]; then
        echo ""
        echo "📃 转写文本:"
        echo "$TEXT"
    fi
elif [ "$CODE" = "0" ] && [ -n "$STATUS" ]; then
    echo ""
    echo "❌ 转写失败，状态: $STATUS"
else
    echo ""
    echo "❌ 转写失败，请检查错误信息"
fi

echo ""
echo "=== 方式2: 异步转写（分步）==="
echo "📝 步骤1 - 提交任务..."

TASK_RESPONSE=$(curl -s -X POST "$API_BASE/api/v1/asr/transcribe" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "{\"fileUrls\": [\"$AUDIO_URL\"]}")

echo "$TASK_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$TASK_RESPONSE"

# 提取 taskId
TASK_ID=$(echo "$TASK_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('taskId',''))" 2>/dev/null || echo "")

if [ -z "$TASK_ID" ]; then
    echo "❌ 获取任务ID失败"
    exit 1
fi

echo ""
echo "📝 步骤2 - 查询状态..."
sleep 2

STATUS_RESPONSE=$(curl -s -X GET "$API_BASE/api/v1/asr/task/$TASK_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN")

echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"

echo ""
echo "📝 步骤3 - 获取结果..."

RESULT_RESPONSE=$(curl -s -X GET "$API_BASE/api/v1/asr/result/$TASK_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN")

echo "$RESULT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESULT_RESPONSE"

echo ""
echo "=== 测试完成 ==="

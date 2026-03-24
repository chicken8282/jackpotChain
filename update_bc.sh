#!/bin/bash

# 1. 외부의 진짜 블록체인 레포 강제 최신화
cd ../blockchain_origin
echo "🔄 GitHub 원격 코드 강제 동기화 중..."
git merge --abort 2>/dev/null  # 혹시 병합 중이면 취소
git fetch origin dev
git reset --hard origin/dev    # 슬래시(/)가 꼭 있어야 원격 브랜치를 가리킵니다.

# 2. 내 프로젝트 안의 blockchain 폴더로 복사
cd ../S14P21E202
mkdir -p blockchain
cp -r ../blockchain_origin/jackpotchain/. ./blockchain/

# 3. 변경 사항을 GitLab에 Push
echo "🚀 GitLab 원격 레포지토리에 반영 중..."
git add blockchain/
git commit -m "chore: 블록체인 코드 GitHub 최신본으로 강제 동기화"
git push origin BE

echo "✅ 모든 작업이 완료되었습니다!"
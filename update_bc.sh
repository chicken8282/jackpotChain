#!/bin/bash
# 1. 외부의 진짜 블록체인 레포에서 최신 코드 pull
cd ../blockchain_origin
git pull origin dev

# 2. 내 프로젝트 안의 blockchain 폴더로 필요한 부분만 복사
# (이미 존재하면 덮어쓰지만, Git이 변경사항을 추적하므로 안전함)
cp -r jackpotchain ../S14P21E202/blockchain/

echo "✅ 블록체인 코드가 성공적으로 업데이트되었습니다!"

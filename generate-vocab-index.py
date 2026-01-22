#!/usr/bin/env python3
"""
词库索引生成器
将完整的词库 JSON 文件转换为轻量级索引文件

功能：
1. 提取每个单词的基础信息（单词、音标、简单释义）
2. 生成轻量级索引文件（用于快速加载）
3. 保持原始文件不变（用于按需加载详情）

使用方法：
python generate-vocab-index.py
"""

import json
import os
from pathlib import Path

# 配置
VOCAB_DIR = Path('assets/english-vocabulary')
INDEX_DIR = VOCAB_DIR / 'index'
DETAILS_DIR = VOCAB_DIR / 'details'

def extract_basic_info(word_data):
    """
    从完整的单词数据中提取基础信息
    
    Args:
        word_data: 完整的单词数据对象
        
    Returns:
        dict: 包含基础信息的轻量级对象
    """
    try:
        content = word_data.get('content', {}).get('word', {}).get('content', {})
        
        # 提取音标
        usphone = content.get('usphone', '')
        ukphone = content.get('ukphone', '')
        phonetic = f"/{usphone}/" if usphone else (f"/{ukphone}/" if ukphone else '')
        
        # 提取释义（只取第一个）
        trans = content.get('trans', [])
        meaning = ''
        if trans:
            first_trans = trans[0]
            pos = first_trans.get('pos', '')
            tran_cn = first_trans.get('tranCn', '')
            meaning = f"{pos}. {tran_cn}" if pos else tran_cn
        
        # 返回轻量级对象
        return {
            'id': word_data.get('content', {}).get('word', {}).get('wordId', ''),
            'word': word_data.get('headWord', ''),
            'phonetic': phonetic,
            'meaning': meaning,
            'rank': word_data.get('wordRank', 0)
        }
    except Exception as e:
        print(f"Error extracting basic info: {e}")
        return None

def save_word_details(word_data, bank_id, file_index):
    """
    保存单词的完整详情到单独的文件
    
    Args:
        word_data: 完整的单词数据
        bank_id: 词库ID（如 'kaoyan', 'cet6'）
        file_index: 文件索引（如 1, 2, 3）
    """
    word_id = word_data.get('content', {}).get('word', {}).get('wordId', '')
    if not word_id:
        return
    
    # 创建详情目录
    details_bank_dir = DETAILS_DIR / bank_id
    details_bank_dir.mkdir(parents=True, exist_ok=True)
    
    # 保存详情文件（使用 wordId 作为文件名）
    detail_file = details_bank_dir / f"{word_id}.json"
    with open(detail_file, 'w', encoding='utf-8') as f:
        json.dump(word_data, f, ensure_ascii=False, separators=(',', ':'))

def process_vocab_file(input_file, bank_id, file_index):
    """
    处理单个词库文件
    
    Args:
        input_file: 输入的完整词库文件路径
        bank_id: 词库ID
        file_index: 文件索引
        
    Returns:
        list: 轻量级索引列表
    """
    print(f"Processing {input_file.name}...")
    
    # 读取完整词库
    with open(input_file, 'r', encoding='utf-8') as f:
        words = json.load(f)
    
    print(f"  Found {len(words)} words")
    
    # 提取基础信息
    index_list = []
    for word_data in words:
        basic_info = extract_basic_info(word_data)
        if basic_info:
            index_list.append(basic_info)
            
            # 保存详情（可选，如果想要单独的详情文件）
            # save_word_details(word_data, bank_id, file_index)
    
    print(f"  Extracted {len(index_list)} basic entries")
    return index_list

def generate_indexes():
    """
    生成所有词库的索引文件
    """
    # 创建索引目录
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    
    # 词库配置
    banks = {
        'kaoyan': ['KaoYan_1.json', 'KaoYan_2.json', 'KaoYan_3.json'],
        'cet6': ['CET6_1.json', 'CET6_2.json', 'CET6_3.json']
    }
    
    for bank_id, files in banks.items():
        print(f"\n{'='*60}")
        print(f"Processing {bank_id.upper()} word bank")
        print(f"{'='*60}")
        
        all_indexes = []
        
        for i, filename in enumerate(files, 1):
            input_file = VOCAB_DIR / filename
            if not input_file.exists():
                print(f"Warning: {filename} not found, skipping...")
                continue
            
            # 处理文件
            indexes = process_vocab_file(input_file, bank_id, i)
            all_indexes.extend(indexes)
        
        # 保存合并的索引文件
        index_file = INDEX_DIR / f"{bank_id}_index.json"
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(all_indexes, f, ensure_ascii=False, separators=(',', ':'))
        
        # 计算文件大小
        original_size = sum((VOCAB_DIR / f).stat().st_size for f in files if (VOCAB_DIR / f).exists())
        index_size = index_file.stat().st_size
        
        print(f"\n{bank_id.upper()} Summary:")
        print(f"  Total words: {len(all_indexes)}")
        print(f"  Original size: {original_size / 1024 / 1024:.2f} MB")
        print(f"  Index size: {index_size / 1024:.2f} KB")
        print(f"  Compression ratio: {original_size / index_size:.1f}x")
        print(f"  Saved: {(original_size - index_size) / 1024 / 1024:.2f} MB")

def main():
    """主函数"""
    print("Vocabulary Index Generator")
    print("=" * 60)
    
    # 检查词库目录
    if not VOCAB_DIR.exists():
        print(f"Error: Vocabulary directory not found: {VOCAB_DIR}")
        return
    
    # 生成索引
    generate_indexes()
    
    print("\n" + "=" * 60)
    print("Index generation completed!")
    print(f"Index files saved to: {INDEX_DIR}")

if __name__ == '__main__':
    main()

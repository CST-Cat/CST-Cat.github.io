import shutil
import os
# 先删除目标文件
try:
    os.remove('_site/assets/vocabulary.js')
except:
    pass
# 再复制
shutil.copy('assets/vocabulary.js', '_site/assets/vocabulary.js')
print('File copied successfully')

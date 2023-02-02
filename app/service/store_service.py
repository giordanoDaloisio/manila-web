import os
from dotenv import load_dotenv
from deta import Deta

load_dotenv()
deta = Deta(os.getenv("DETA_KEY"))

def store_file(file, folder_name):
  folder = deta.Drive(folder_name)
  file_name = folder.put('model.pkl', file)
  return file_name
import os
from typing import List, Dict
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import sglang as sgl
from dotenv import load_dotenv
import traceback
import logging
from pathlib import Path
import json

# 初始化日志记录
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 设置环境和数据目录
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
dotenv_path = parent_dir / '.env.local'

if not dotenv_path.exists():
    logger.error(f"缺少 .env.local 文件: {dotenv_path}")
    raise FileNotFoundError(f"在此路径找不到 .env.local: {dotenv_path}")

load_dotenv(dotenv_path=dotenv_path)

data_folder = parent_dir / 'data'
if not data_folder.exists():
    data_folder.mkdir()
    logger.info(f"创建数据文件夹: {data_folder}")

app = FastAPI()
origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [origin.strip() for origin in origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
if not openrouter_api_key:
    logger.error("请在 .env.local 中设置 OPENROUTER_API_KEY。")
    raise RuntimeError("缺少 OPENROUTER_API_KEY。")

backend = sgl.OpenAI(
    model_name="gpt-3.5-turbo",  
    base_url="https://openrouter.ai/api/v1",
    api_key=openrouter_api_key,
)
sgl.set_default_backend(backend)


class Message(BaseModel):
    role: str
    content: str

class Configuration(BaseModel):
    model: str
    max_tokens: int
    temperature: float = 0.7

class ChatRequest(BaseModel):
    messages: List[Message]
    configuration: Configuration

class ThreadData(BaseModel):
    threadId: str
    thread: Dict

class ChatResponse(BaseModel):
    response: str

class Model(BaseModel):
    id: str
    name: str
    baseModel: str
    systemPrompt: str
    temperature: float
    maxTokens: int


@sgl.function
def multi_turn_question(s, messages: List[Message], model_name: str, max_tokens: int, temperature: float):
    print(f"Debug: model_name={model_name}, temperature={temperature}, max_tokens={max_tokens}")
    s.set_options(model=model_name, temperature=temperature, max_tokens=max_tokens)
    for msg in messages:
        if msg.role == "system":
            s += sgl.system(msg.content)
        elif msg.role == "user":
            s += sgl.user(msg.content)
        elif msg.role == "assistant":
            s += sgl.assistant(msg.content)
    s += sgl.assistant(sgl.gen("response"))


models_file = data_folder / "models.json"
models_list = []

def load_models_from_file():
    global models_list
    try:
        if models_file.exists():
            with models_file.open("r", encoding="utf-8") as f:
                models_list = json.load(f)
        else:
            models_list = [
                {
                    "id": "1",
                    "name": "Default Model",
                    "baseModel": "gpt-4o-mini",
                    "systemPrompt": "You are a helpful assistant.",
                    "temperature": 0.7,
                    "maxTokens": 512,
                }
            ]
    except Exception as e:
        logger.error(f"加载模型文件失败: {str(e)}")
        models_list = []

load_models_from_file()

@app.get("/api/connect")
async def connect():
    logger.info("已连接到后端。")
    return JSONResponse(content={"message": "successful"}, status_code=200)

@app.post("/api/save_thread")
async def save_thread(thread_data: ThreadData):
    try:
        thread_id = thread_data.threadId
        thread = thread_data.thread

        thread_file = data_folder / f"{thread_id}.json"
        with thread_file.open("w", encoding="utf-8") as f:
            json.dump(thread, f, ensure_ascii=False, indent=4)
        logger.info(f"成功保存线程 {thread_id}。")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"保存线程失败: {str(e)}")
        raise HTTPException(status_code=500, detail="保存线程失败")

@app.get("/api/load_threads")
async def load_threads():
    try:
        threads = []
        for thread_file in data_folder.glob("*.json"):
            if thread_file.name == "models.json":
                continue
            with thread_file.open("r", encoding="utf-8") as f:
                thread = json.load(f)
                threads.append(thread)
        logger.info(f"成功加载了 {len(threads)} 个线程。")
        return {"threads": threads}
    except Exception as e:
        logger.error(f"加载线程失败: {str(e)}")
        raise HTTPException(status_code=500, detail="加载线程失败")

@app.delete("/api/delete_thread/{thread_id}")
async def delete_thread(thread_id: str):
    try:
        thread_file = data_folder / f"{thread_id}.json"
        if thread_file.exists():
            thread_file.unlink()
            logger.info(f"成功删除线程 {thread_id}。")
            return {"status": "success", "message": f"线程 {thread_id} 已删除"}
        else:
            logger.error(f"线程 {thread_id} 不存在。")
            raise HTTPException(status_code=404, detail="线程未找到")
    except Exception as e:
        logger.error(f"删除线程失败: {str(e)}")
        raise HTTPException(status_code=500, detail="删除线程失败")

@app.get("/api/load_models")
async def load_models():
    try:
        models_file = data_folder / "models.json"
        if not models_file.exists():
            default_models = [
                {
                    "id": "1",
                    "name": "Default Model",
                    "baseModel": "gpt-4o-mini",
                    "systemPrompt": "You are a helpful assistant.",
                    "temperature": 0.7,
                    "maxTokens": 512,
                }
            ]
            return {"models": default_models}
        else:
            with models_file.open("r", encoding="utf-8") as f:
                models = json.load(f)
            return {"models": models}
    except Exception as e:
        logger.error(f"加载模型失败: {str(e)}")
        raise HTTPException(status_code=500, detail="加载模型失败")

@app.post("/api/save_models")
async def save_models(request: Request):
    try:
        data = await request.json()
        models = data.get("models")
        if models is None:
            raise HTTPException(status_code=400, detail="未提供模型数据")

        models_file = data_folder / "models.json"
        with models_file.open("w", encoding="utf-8") as f:
            json.dump(models, f, ensure_ascii=False, indent=4)
        logger.info(f"模型已成功保存。")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"保存模型失败: {str(e)}")
        raise HTTPException(status_code=500, detail="保存模型失败")

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
       
        model_name = request.configuration.model
        max_tokens = request.configuration.max_tokens
        temperature = request.configuration.temperature

   
        async def generate_response():
            state = multi_turn_question.run(
                request.messages,
                model_name,
                max_tokens,
                temperature,
                stream=True
            )

            async for chunk in state.text_async_iter(var_name="response"):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate_response(), media_type="text/event-stream")

    except Exception as e:
        logger.error(f"/api/chat 中出错: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="后端错误")

if __name__ == "__main__":
    logger.info("启动 FastAPI 服务器...")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    logger.info("API 密钥已加载。")
    print("允许的来源：", allowed_origins)

"""
MPP Spend Endpoint — The inference service Kilo pays for.
Powered by NVIDIA NIM (stub — will connect to real NIM endpoint).
Returns HTTP 402 until paid, then serves real inference.
"""
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import json, os, time, uuid, hashlib

app = FastAPI(title="Edgeless MPP Spend Service (NIM-Powered)")

PRICE_USDC = "0.50"
SERVICE_NAME = "Edgeless Inference API — Hermes on NVIDIA NIM"
PAYMENTS_FILE = os.path.join(os.path.dirname(__file__), "payments.jsonl")

@app.get("/health")
async def health():
    return {"status": "ok", "nim": "active", "service": SERVICE_NAME}

@app.post("/inference")
async def inference(request: Request):
    """Paid inference endpoint. Returns 402 unless paid."""
    
    payment_proof = request.headers.get("x-mpp-receipt") or request.headers.get("x-payment-proof")
    
    if payment_proof:
        payment = {
            "id": str(uuid.uuid4()),
            "timestamp": time.time(),
            "proof": payment_proof[:100],
            "amount": PRICE_USDC
        }
        with open(PAYMENTS_FILE, "a") as f:
            f.write(json.dumps(payment) + "\n")
        
        # Real inference (stub — connects to NIM)
        body = await request.json() if request.headers.get("content-type") == "application/json" else {}
        prompt = body.get("prompt", "Analyze market conditions")
        
        return JSONResponse({
            "status": "paid",
            "payment_id": payment["id"],
            "model": "hermes-on-nim",
            "inference": run_inference(prompt),
            "service": SERVICE_NAME
        })
    
    return Response(
        content=json.dumps({"error": "payment_required", "price_usdc": PRICE_USDC}),
        status_code=402,
        headers={
            "www-authenticate": f'tempo amount={PRICE_USDC} currency=USDC description="{SERVICE_NAME}"',
            "x-mpp-version": "1.0",
            "x-nim-backend": "nemotron-3-ultra"
        }
    )

def run_inference(prompt: str) -> dict:
    """Stub inference — will call NVIDIA NIM endpoint."""
    return {
        "prompt_hash": hashlib.sha256(prompt.encode()).hexdigest()[:16],
        "response": f"NIM inference complete for: {prompt[:100]}...",
        "tokens": {"input": len(prompt.split()), "output": 50},
        "model": "hermes-on-nemotron-3-ultra",
        "nim_instance": "nim-spend-001"
    }

@app.get("/balance")
async def balance():
    total = 0
    if os.path.exists(PAYMENTS_FILE):
        with open(PAYMENTS_FILE) as f:
            for line in f:
                if line.strip():
                    total += float(json.loads(line).get("amount", 0))
    count = sum(1 for _ in open(PAYMENTS_FILE)) if os.path.exists(PAYMENTS_FILE) else 0
    return {"total_earned_usdc": total, "payments_count": count}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8401)

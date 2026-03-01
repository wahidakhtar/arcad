from fastapi import HTTPException

def require(condition: bool, message: str = "Forbidden"):
    if not condition:
        raise HTTPException(status_code=403, detail=message)

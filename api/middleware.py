from fastapi import Request, HTTPException, status
from jose import jwt, JWTError
import os

SECRET_KEY = os.environ.get('SECRET_KEY', 'durra-secret-key-change-in-production')
ALGORITHM = "HS256"

async def get_company_id_from_token(request: Request) -> str:
    """
    Extract company_id from JWT token in request headers
    Used as middleware to ensure data isolation
    """
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = auth_header.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        company_id = payload.get("company_id")
        
        if not company_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing company_id"
            )
        
        return company_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

def filter_by_company(query: dict, company_id: str) -> dict:
    """
    Add company_id filter to database query
    Ensures data isolation between companies
    """
    query["company_id"] = company_id
    return query

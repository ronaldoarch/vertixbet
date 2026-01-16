import httpx
import json
from typing import Optional, Dict, Any, List
from models import IGameWinAgent
from sqlalchemy.orm import Session


class IGameWinAPI:
    def __init__(
        self,
        agent_code: str,
        agent_key: str,
        api_url: str = "https://igamewin.com",
        credentials: Optional[Dict[str, Any]] = None
    ):
        self.agent_code = agent_code
        self.agent_key = agent_key  # maps to agent_token in requests
        self.api_url = api_url.rstrip('/')
        # Detect base url for /api/v1 according to doc
        if self.api_url.endswith("/api/v1"):
            self.base_url = self.api_url
        elif self.api_url.endswith("/api"):
            self.base_url = f"{self.api_url}/v1"
        else:
            self.base_url = f"{self.api_url}/api/v1"
        self.credentials = credentials or {}
        self.last_error: Optional[str] = None
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Content-Type": "application/json"
        }
    
    async def create_user(self, username: str, password: str, email: str) -> Optional[Dict[str, Any]]:
        """Create user in igamewin system"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/users",
                    headers=self._get_headers(),
                    json={
                        "username": username,
                        "password": password,
                        "email": email
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Error creating user in igamewin: {e}")
                return None
    
    async def get_user_balance(self, username: str) -> Optional[float]:
        """Get user balance from igamewin"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/users/{username}/balance",
                    headers=self._get_headers(),
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                return data.get("balance", 0.0)
            except httpx.HTTPError as e:
                print(f"Error getting user balance from igamewin: {e}")
                return None
    
    async def transfer_in(self, username: str, amount: float, transaction_id: str) -> Optional[Dict[str, Any]]:
        """Transfer money into user account"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/transfers/in",
                    headers=self._get_headers(),
                    json={
                        "username": username,
                        "amount": amount,
                        "transaction_id": transaction_id
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Error transferring in igamewin: {e}")
                return None
    
    async def transfer_out(self, username: str, amount: float, transaction_id: str) -> Optional[Dict[str, Any]]:
        """Transfer money out of user account"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/transfers/out",
                    headers=self._get_headers(),
                    json={
                        "username": username,
                        "amount": amount,
                        "transaction_id": transaction_id
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                print(f"Error transferring out igamewin: {e}")
                return None
    
    async def _post(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        self.last_error = None
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.base_url,
                    headers=self._get_headers(),
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                # API de business retorna status 1/0
                if isinstance(data, dict) and data.get("status") not in (None, 1):
                    self.last_error = f"status={data.get('status')} msg={data.get('msg')}"
                    return None
                return data
            except httpx.HTTPError as e:
                body_preview = ""
                try:
                    body_preview = e.response.text[:500] if hasattr(e, "response") and e.response else ""
                except Exception:
                    pass
                self.last_error = f"{e} {body_preview}"
                print(f"Error calling igamewin: {self.last_error}")
                return None

    async def get_providers(self) -> Optional[List[Dict[str, Any]]]:
        payload = {
            "method": "provider_list",
            "agent_code": self.agent_code,
            "agent_token": self.agent_key
        }
        data = await self._post(payload)
        if not data:
            return None
        return data.get("providers")

    async def get_games(self, provider_code: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        payload: Dict[str, Any] = {
            "method": "game_list",
            "agent_code": self.agent_code,
            "agent_token": self.agent_key
        }
        if provider_code:
            payload["provider_code"] = provider_code
        # Allow provider_code from credentials default
        if not provider_code and isinstance(self.credentials, dict):
            default_provider = self.credentials.get("provider_code")
            if default_provider:
                payload["provider_code"] = default_provider

        data = await self._post(payload)
        if not data:
            return None
        return data.get("games")


def get_igamewin_api(db: Session) -> Optional[IGameWinAPI]:
    """Get active igamewin agent and return API instance"""
    agent = db.query(IGameWinAgent).filter(IGameWinAgent.is_active == True).first()
    if not agent:
        return None
    credentials_dict: Dict[str, Any] = {}
    if agent.credentials:
        try:
            credentials_dict = json.loads(agent.credentials)
        except Exception:
            credentials_dict = {}
    return IGameWinAPI(
        agent_code=agent.agent_code,
        agent_key=agent.agent_key,
        api_url=agent.api_url,
        credentials=credentials_dict
    )

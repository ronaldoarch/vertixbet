from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import os
import uuid
from pathlib import Path

from database import get_db
from dependencies import get_current_admin_user
from models import User, MediaAsset, MediaType

router = APIRouter(prefix="/api/admin/media", tags=["media"])
public_router = APIRouter(prefix="/api/public/media", tags=["public-media"])

# Configuração de uploads
# Usar caminho absoluto baseado em /app (container) ou diretório atual (desenvolvimento)
# Verificar se estamos em container (caminho /app existe) ou usar caminho relativo
if Path("/app").exists():
    UPLOAD_BASE_DIR = Path("/app/uploads")
else:
    # Desenvolvimento local - usar caminho absoluto baseado no diretório atual
    import os
    current_dir = Path(os.getcwd())
    # Se estamos em /backend, usar uploads relativo; senão, usar /app/uploads como fallback
    if (current_dir / "uploads").exists():
        UPLOAD_BASE_DIR = current_dir / "uploads"
    else:
        UPLOAD_BASE_DIR = Path("uploads")

UPLOAD_DIRS = {
    MediaType.LOGO: UPLOAD_BASE_DIR / "logos",
    MediaType.BANNER: UPLOAD_BASE_DIR / "banners",
}

# Criar diretórios se não existirem
for upload_dir in UPLOAD_DIRS.values():
    upload_dir.mkdir(parents=True, exist_ok=True)

# Log para debug (apenas em desenvolvimento)
import logging
logger = logging.getLogger(__name__)
logger.info(f"UPLOAD_BASE_DIR configurado como: {UPLOAD_BASE_DIR.absolute()}")
logger.info(f"Diretórios de upload: {[str(d.absolute()) for d in UPLOAD_DIRS.values()]}")

# Tipos de arquivo permitidos
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
RECOMMENDED_SIZE = 500 * 1024  # 500KB


def generate_filename(original_filename: str) -> str:
    """Gera nome único para arquivo"""
    ext = Path(original_filename).suffix
    unique_id = str(uuid.uuid4())[:8]
    timestamp = int(datetime.utcnow().timestamp())
    return f"{timestamp}-{unique_id}{ext}"


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    media_type: str = Form(...),  # "logo" ou "banner"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Upload de imagem (logo ou banner)"""
    try:
        # Validar tipo
        try:
            media_type_enum = MediaType(media_type.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo inválido. Use 'logo' ou 'banner'"
            )

        # Validar MIME type
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de arquivo não permitido. Use JPG, PNG, WebP ou SVG"
            )

        # Validar tamanho
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Arquivo muito grande (máximo 5MB, recomendado < 500KB)"
            )

        # Gerar nome único
        filename = generate_filename(file.filename)
        upload_dir = UPLOAD_DIRS[media_type_enum]
        file_path = upload_dir / filename

        # Log antes de salvar
        logger.info(f"[UPLOAD] Salvando arquivo: {filename}")
        logger.info(f"[UPLOAD] Diretório: {upload_dir.absolute()}")
        logger.info(f"[UPLOAD] Caminho completo: {file_path.absolute()}")
        logger.info(f"[UPLOAD] Diretório existe: {upload_dir.exists()}")

        # Salvar arquivo
        with open(file_path, "wb") as f:
            f.write(file_content)

        # Verificar se arquivo foi salvo
        if not file_path.exists():
            logger.error(f"[UPLOAD] ERRO: Arquivo não foi salvo em {file_path.absolute()}")
            raise HTTPException(
                status_code=500,
                detail=f"Erro ao salvar arquivo em {file_path.absolute()}"
            )
        
        logger.info(f"[UPLOAD] Arquivo salvo com sucesso: {file_path.absolute()}")

        # Obter próxima posição para banners
        position = 0
        if media_type_enum == MediaType.BANNER:
            max_position = db.query(func.max(MediaAsset.position)).filter(
                MediaAsset.type == MediaType.BANNER
            ).scalar()
            position = (max_position or 0) + 1

        # Determinar nome do diretório na URL (sempre plural: logos, banners)
        url_dir = "logos" if media_type_enum == MediaType.LOGO else "banners"
        
        # Salvar referência no banco (URL relativa que será servida pela rota /api/public/media/uploads/...)
        media_asset = MediaAsset(
            type=media_type_enum,
            url=f"/api/public/media/uploads/{url_dir}/{filename}",
            filename=filename,
            file_size=file_size,
            mime_type=file.content_type,
            is_active=True,
            position=position,
        )
        db.add(media_asset)
        db.commit()
        db.refresh(media_asset)

        return {
            "success": True,
            "id": media_asset.id,
            "url": media_asset.url,
            "filename": media_asset.filename,
            "type": media_asset.type.value,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao fazer upload: {str(e)}"
        )


@router.get("/list")
async def list_media(
    media_type: Optional[str] = None,  # "logo" ou "banner" ou None para todos
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Listar mídias (admin)"""
    query = db.query(MediaAsset)
    
    if media_type:
        try:
            media_type_enum = MediaType(media_type.lower())
            query = query.filter(MediaAsset.type == media_type_enum)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo inválido. Use 'logo' ou 'banner'"
            )

    assets = query.order_by(MediaAsset.position.asc(), MediaAsset.created_at.desc()).all()
    
    return [
        {
            "id": asset.id,
            "type": asset.type.value,
            "url": asset.url,
            "filename": asset.filename,
            "file_size": asset.file_size,
            "mime_type": asset.mime_type,
            "is_active": asset.is_active,
            "position": asset.position,
            "created_at": asset.created_at.isoformat(),
        }
        for asset in assets
    ]


@router.delete("/{media_id}")
async def delete_media(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Deletar mídia"""
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Mídia não encontrada")

    # Deletar arquivo físico
    # Extrair path da URL: /api/public/media/uploads/logos/file.jpg -> logos/file.jpg
    url_path = asset.url.replace("/api/public/media/uploads/", "").lstrip("/")
    
    # Se ainda tiver prefixo, remover (compatibilidade com URLs antigas)
    if "/" in url_path:
        parts = url_path.split("/", 1)
        file_path = UPLOAD_BASE_DIR / parts[0] / parts[1] if len(parts) == 2 else UPLOAD_BASE_DIR / url_path
    else:
        # Fallback: usar diretório baseado no tipo
        upload_dir = UPLOAD_DIRS.get(asset.type)
        file_path = upload_dir / asset.filename if upload_dir else None
    
    if file_path and file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            print(f"Erro ao deletar arquivo físico: {e}")

    # Deletar do banco
    db.delete(asset)
    db.commit()

    return {"success": True, "message": "Mídia deletada com sucesso"}


@router.put("/{media_id}/position")
async def update_position(
    media_id: int,
    position: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Atualizar posição de banner"""
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Mídia não encontrada")

    asset.position = position
    db.commit()
    db.refresh(asset)

    return {
        "success": True,
        "id": asset.id,
        "position": asset.position,
    }


@router.put("/{media_id}/toggle-active")
async def toggle_active(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Ativar/desativar mídia"""
    asset = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Mídia não encontrada")

    asset.is_active = not asset.is_active
    db.commit()
    db.refresh(asset)

    return {
        "success": True,
        "id": asset.id,
        "is_active": asset.is_active,
    }


# ========== ROTAS PÚBLICAS ==========

@public_router.get("/banners")
async def get_public_banners(db: Session = Depends(get_db)):
    """Listar banners ativos (público)"""
    banners = db.query(MediaAsset).filter(
        MediaAsset.type == MediaType.BANNER,
        MediaAsset.is_active == True
    ).order_by(MediaAsset.position.asc()).all()

    return [
        {
            "id": banner.id,
            "url": banner.url,
            "position": banner.position,
        }
        for banner in banners
    ]


@public_router.get("/logo")
async def get_public_logo(db: Session = Depends(get_db)):
    """Obter logo ativa (público)"""
    logo = db.query(MediaAsset).filter(
        MediaAsset.type == MediaType.LOGO,
        MediaAsset.is_active == True
    ).order_by(MediaAsset.created_at.desc()).first()

    if not logo:
        return {"url": None}

    return {"url": logo.url}


# Servir arquivos estáticos
@public_router.get("/uploads/{media_type}/{filename}")
async def serve_uploaded_file(media_type: str, filename: str, db: Session = Depends(get_db)):
    """Servir arquivo de upload"""
    logger.info(f"[SERVE FILE] Requisição recebida: media_type={media_type}, filename={filename}")
    
    # Decodificar URL encoding (ex: %5B vira [, %20 vira espaço)
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    
    # Mapear tipo da URL para diretório físico (plural)
    dir_mapping = {
        "logo": "logos",
        "logos": "logos",
        "banner": "banners",
        "banners": "banners",
    }
    upload_dir = dir_mapping.get(media_type.lower(), media_type)
    
    # Tentar primeiro com o filename decodificado
    file_path = UPLOAD_BASE_DIR / upload_dir / decoded_filename
    
    # Se não encontrou, buscar no banco para encontrar o filename correto
    if not file_path.exists():
        logger.warning(f"[SERVE FILE] Arquivo não encontrado: {decoded_filename}")
        
        # Buscar no banco de dados pelo filename (pode ser que o banco tenha o nome errado)
        # Tentar buscar pelo filename exato primeiro
        asset = db.query(MediaAsset).filter(
            MediaAsset.filename == decoded_filename
        ).first()
        
        # Se não encontrou, buscar pelo tipo e usar o arquivo mais recente ativo
        if not asset:
            media_type_enum = MediaType.LOGO if upload_dir == "logos" else MediaType.BANNER
            asset = db.query(MediaAsset).filter(
                MediaAsset.type == media_type_enum,
                MediaAsset.is_active == True
            ).order_by(MediaAsset.created_at.desc()).first()
        
        if asset and asset.filename:
            # Tentar com o filename do banco
            file_path = UPLOAD_BASE_DIR / upload_dir / asset.filename
            logger.info(f"[SERVE FILE] Tentando com filename do banco: {asset.filename}")
            
            # Se ainda não encontrou, buscar arquivo mais recente do diretório
            if not file_path.exists():
                logger.warning(f"[SERVE FILE] Arquivo do banco também não existe. Buscando arquivo mais recente...")
                dir_path = UPLOAD_BASE_DIR / upload_dir
                if dir_path.exists():
                    try:
                        files = [f for f in dir_path.iterdir() if f.is_file()]
                        if files:
                            files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
                            file_path = files[0]
                            logger.info(f"[SERVE FILE] Usando arquivo mais recente do diretório: {file_path.name}")
                        else:
                            raise HTTPException(status_code=404, detail=f"Nenhum arquivo encontrado no diretório {upload_dir}")
                    except HTTPException:
                        raise
                    except Exception as e:
                        logger.error(f"[SERVE FILE] Erro ao buscar arquivo alternativo: {e}")
                        raise HTTPException(status_code=404, detail=f"Arquivo não encontrado: {decoded_filename}")
                else:
                    raise HTTPException(status_code=404, detail=f"Diretório não existe: {upload_dir}")
        else:
            # Se não encontrou no banco, tentar buscar arquivo mais recente do diretório
            dir_path = UPLOAD_BASE_DIR / upload_dir
            if dir_path.exists():
                try:
                    files = [f for f in dir_path.iterdir() if f.is_file()]
                    if files:
                        files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
                        file_path = files[0]
                        logger.info(f"[SERVE FILE] Asset não encontrado no banco. Usando arquivo mais recente: {file_path.name}")
                    else:
                        raise HTTPException(status_code=404, detail=f"Nenhum arquivo encontrado no diretório {upload_dir}")
                except HTTPException:
                    raise
                except Exception as e:
                    logger.error(f"[SERVE FILE] Erro ao buscar arquivo alternativo: {e}")
                    raise HTTPException(status_code=404, detail=f"Arquivo não encontrado: {decoded_filename}")
            else:
                raise HTTPException(status_code=404, detail=f"Diretório não existe: {upload_dir}")
    
    # Log para debug
    logger.info(f"[SERVE FILE] Caminho completo: {file_path.absolute()}")
    logger.info(f"[SERVE FILE] Arquivo existe: {file_path.exists()}")
    
    if not file_path.exists():
        # Verificar se o diretório existe
        dir_path = UPLOAD_BASE_DIR / upload_dir
        logger.error(f"[SERVE FILE] Arquivo não encontrado: {file_path.absolute()}")
        logger.error(f"[SERVE FILE] Diretório existe: {dir_path.exists()}")
        logger.error(f"[SERVE FILE] UPLOAD_BASE_DIR: {UPLOAD_BASE_DIR.absolute()}")
        if dir_path.exists():
            # Listar arquivos no diretório para debug
            try:
                files = list(dir_path.iterdir())
                logger.error(f"[SERVE FILE] Arquivos no diretório: {[f.name for f in files]}")
            except Exception as e:
                logger.error(f"[SERVE FILE] Erro ao listar diretório: {e}")
        raise HTTPException(status_code=404, detail=f"Arquivo não encontrado: {file_path.absolute()}")

    # Detectar tipo MIME baseado na extensão
    ext = file_path.suffix.lower()
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
    }
    mime_type = mime_map.get(ext, "image/jpeg")

    # Usar o nome real do arquivo, não o da URL
    actual_filename = file_path.name
    logger.info(f"[SERVE FILE] Servindo arquivo com sucesso: {actual_filename}, tipo: {mime_type}")
    return FileResponse(
        file_path,
        media_type=mime_type,
        filename=actual_filename
    )


# Rota de fallback para URLs antigas (sem media_type) - compatibilidade
@public_router.get("/uploads/{filename}")
async def serve_uploaded_file_fallback(filename: str, db: Session = Depends(get_db)):
    """Servir arquivo de upload (fallback para URLs antigas sem tipo)"""
    logger.info(f"[SERVE FILE FALLBACK] Requisição recebida: filename={filename}")
    
    # Decodificar URL encoding
    from urllib.parse import unquote
    decoded_filename = unquote(filename)
    
    # Tentar encontrar o arquivo no banco de dados para determinar o tipo
    asset = db.query(MediaAsset).filter(MediaAsset.filename == decoded_filename).first()
    
    if asset:
        # Se encontrou no banco, usar o tipo do asset
        upload_dir = "logos" if asset.type == MediaType.LOGO else "banners"
        file_path = UPLOAD_BASE_DIR / upload_dir / decoded_filename
        logger.info(f"[SERVE FILE FALLBACK] Asset encontrado no banco: tipo={asset.type.value}, diretório={upload_dir}")
    else:
        # Tentar em ambos os diretórios (fallback)
        file_path = None
        for upload_dir in ["logos", "banners"]:
            test_path = UPLOAD_BASE_DIR / upload_dir / decoded_filename
            if test_path.exists():
                file_path = test_path
                logger.info(f"[SERVE FILE FALLBACK] Arquivo encontrado em: {upload_dir}")
                break
        
        # Se ainda não encontrou, buscar arquivo mais recente do tipo correto
        if not file_path:
            logger.warning(f"[SERVE FILE FALLBACK] Arquivo não encontrado. Buscando arquivo mais recente...")
            # Tentar buscar pelo tipo mais provável (logo ou banner) baseado no contexto
            # Por padrão, tentar logos primeiro, depois banners
            for upload_dir in ["logos", "banners"]:
                dir_path = UPLOAD_BASE_DIR / upload_dir
                if dir_path.exists():
                    try:
                        files = [f for f in dir_path.iterdir() if f.is_file()]
                        if files:
                            files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
                            file_path = files[0]
                            logger.info(f"[SERVE FILE FALLBACK] Usando arquivo mais recente de {upload_dir}: {file_path.name}")
                            break
                    except Exception as e:
                        logger.error(f"[SERVE FILE FALLBACK] Erro ao buscar em {upload_dir}: {e}")
        
        if not file_path:
            logger.error(f"[SERVE FILE FALLBACK] Arquivo não encontrado em nenhum diretório: {decoded_filename}")
            raise HTTPException(status_code=404, detail=f"Arquivo não encontrado: {decoded_filename}")
    
    if not file_path.exists():
        logger.error(f"[SERVE FILE FALLBACK] Arquivo não existe no caminho: {file_path.absolute()}")
        raise HTTPException(status_code=404, detail=f"Arquivo não encontrado: {file_path}")

    # Detectar tipo MIME baseado na extensão ou usar o mime_type do banco se disponível
    mime_type = None
    if asset and asset.mime_type:
        mime_type = asset.mime_type
    else:
        ext = file_path.suffix.lower()
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
        }
        mime_type = mime_map.get(ext, "image/jpeg")

    logger.info(f"[SERVE FILE FALLBACK] Servindo arquivo: {file_path.name}, tipo: {mime_type}")
    return FileResponse(
        file_path,
        media_type=mime_type,
        filename=file_path.name
    )

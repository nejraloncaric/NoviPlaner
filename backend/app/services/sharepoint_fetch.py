"""Preuzimanje Excel datoteke s Teams / SharePoint / OneDrive linka."""

from __future__ import annotations

import re
from urllib.parse import parse_qs, unquote, urlparse, urlencode, urlunparse

import httpx

from app.services.excel_import import XLS_MAGIC

MAX_BYTES = 10 * 1024 * 1024
TIMEOUT = 45.0

ALLOWED_HOST_SUFFIXES = (
    ".sharepoint.com",
    ".sharepoint.de",
    ".sharepoint.cn",
    ".sharepoint.us",
    "1drv.ms",
    "teams.microsoft.com",
    "onedrive.live.com",
)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


class SharePointFetchError(Exception):
    pass


def is_allowed_host(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    if not host or host in ("localhost", "127.0.0.1", "0.0.0.0"):
        return False
    if re.match(r"^(10|127|172\.(1[6-9]|2\d|3[01])|192\.168)\.", host):
        return False
    return any(
        host == suffix.lstrip(".") or host.endswith(suffix)
        for suffix in ALLOWED_HOST_SUFFIXES
    )


def _is_excel_bytes(data: bytes) -> bool:
    if len(data) < 4:
        return False
    if data[:8] == XLS_MAGIC:
        return True
    return data[:4] == b"PK\x03\x04"


def _looks_like_html(data: bytes, content_type: str | None) -> bool:
    if content_type and "html" in content_type.lower():
        return True
    head = data[:800].lstrip().lower()
    return head.startswith(b"<!doctype") or head.startswith(b"<html")


def _filename_from_response(url: str, headers: httpx.Headers) -> str | None:
    cd = headers.get("content-disposition") or ""
    match = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";\n]+)"?', cd, re.I)
    if match:
        return unquote(match.group(1).strip())
    path = urlparse(url).path
    name = unquote(path.rsplit("/", 1)[-1]) if path else ""
    if name.lower().endswith((".xlsx", ".xlsm", ".xls")):
        return name
    return None


def _download_url_candidates(url: str) -> list[str]:
    """Mogući URL-ovi za preuzimanje (SharePoint / OneDrive varijante)."""
    candidates: list[str] = []
    seen: set[str] = set()

    def add(u: str) -> None:
        if u and u not in seen:
            seen.add(u)
            candidates.append(u)

    add(url)

    parsed = urlparse(url)
    qs = parse_qs(parsed.query, keep_blank_values=True)

    if "web=1" in parsed.query:
        add(url.replace("web=1", "download=1"))

    if "download=1" not in parsed.query.lower():
        new_qs = dict(qs)
        new_qs["download"] = ["1"]
        add(urlunparse(parsed._replace(query=urlencode(new_qs, doseq=True))))

    # SharePoint sharing token: /:x:/g/TOKEN/...
    share_match = re.search(r"/:x:/[a-z]/([^/?#]+)", parsed.path, re.I)
    if share_match and "sharepoint" in parsed.netloc.lower():
        token = share_match.group(1)
        add(f"{parsed.scheme}://{parsed.netloc}/_layouts/15/download.aspx?share={token}")

    # Direktan put do .xlsx u URL-u
    if parsed.path.lower().endswith((".xlsx", ".xlsm", ".xls")):
        add(url)

    return candidates


def fetch_excel_from_url(url: str) -> tuple[bytes, str | None]:
    """
    Preuzmi Excel s Teams / SharePoint / OneDrive linka.
    Vraća (sadržaj, naziv datoteke).
    """
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        raise SharePointFetchError("Link mora počinjati s http:// ili https://")
    if not is_allowed_host(url):
        raise SharePointFetchError(
            "Link mora biti s Microsoft Teams, SharePoint ili OneDrive "
            "(sharepoint.com, 1drv.ms, teams.microsoft.com…)"
        )

    last_error = "Preuzimanje nije uspjelo"
    with httpx.Client(
        follow_redirects=True,
        timeout=TIMEOUT,
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
    ) as client:
        for try_url in _download_url_candidates(url):
            if not is_allowed_host(try_url):
                continue
            try:
                resp = client.get(try_url)
            except httpx.HTTPError as exc:
                last_error = f"Greška pri povezivanju: {exc}"
                continue

            if resp.status_code >= 400:
                last_error = f"Server je vratio status {resp.status_code}"
                continue

            data = resp.content
            if len(data) > MAX_BYTES:
                raise SharePointFetchError("Datoteka je prevelika (maks. 10 MB)")

            if _looks_like_html(data, resp.headers.get("content-type")):
                last_error = (
                    "Link vraća stranicu za prijavu, ne Excel. "
                    "U SharePointu postavite dijeljenje na „Svi s linkom mogu pregledati” "
                    "ili preuzmite datoteku i učitajte je ručno."
                )
                continue

            if not _is_excel_bytes(data):
                last_error = "Preuzeti sadržaj nije Excel datoteka (.xlsx ili .xls)"
                continue

            filename = _filename_from_response(str(resp.url), resp.headers)
            return data, filename

    raise SharePointFetchError(last_error)

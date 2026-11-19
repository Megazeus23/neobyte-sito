"""Parti comuni di icone.py e sala-stampa.py: quale logo si usa e come si fotografa una pagina con Chrome."""
import os, subprocess, tempfile, pathlib

# Il logo scelto dal titolare: i file sono logo/<LOGO>-simbolo.svg e logo/<LOGO>-completo.svg
LOGO = 'logo-3-rotta-n'

RADICE = pathlib.Path(__file__).resolve().parent.parent   # la cartella del progetto
MODELLI = RADICE / 'strumenti' / 'modelli'

POSTI = [os.environ.get('CHROME', ''),
         r'C:\Program Files\Google\Chrome\Application\chrome.exe',
         r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
         os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe'),
         r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']


def scatta(modello, uscita, larga, alta, domanda=''):
    """Fotografa strumenti/modelli/<modello> in un PNG di larga x alta pixel. domanda: per esempio '?l=en'.

    Usa il Chrome già installato, senza finestra e con un profilo temporaneo suo: non tocca il Chrome
    aperto dall'utente. Se Chrome è in un posto insolito, mettere il percorso nella variabile CHROME.
    """
    chrome = next((p for p in POSTI if p and os.path.exists(p)), None)
    if not chrome:
        raise SystemExit("Chrome non trovato: mettere il percorso nella variabile d'ambiente CHROME.")
    uscita = os.path.abspath(uscita)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as profilo:
        subprocess.run([chrome, '--headless=new', '--no-first-run', '--disable-extensions', '--hide-scrollbars',
                        '--force-device-scale-factor=1', '--allow-file-access-from-files', '--virtual-time-budget=4000',
                        '--user-data-dir=' + profilo, f'--window-size={larga},{alta}', '--screenshot=' + uscita,
                        (MODELLI / modello).as_uri() + domanda],
                       check=True, timeout=120, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not os.path.exists(uscita):
        raise SystemExit('Chrome non ha scritto ' + uscita)
    return uscita

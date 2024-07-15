# ProgrammazioneAvanzata_2024

# Architettura Docker per Inferenze su Modelli di Deep Learning

[![Made with Node.js](https://img.shields.io/badge/Node.js->=12-blue?logo=node.js&logoColor=white)](https://nodejs.org "Go to Node.js homepage") [![Made with TypeScript](https://img.shields.io/badge/TypeScript-4-blue?logo=typescript&logoColor=white)](https://typescriptlang.org "Go to TypeScript homepage") [![Made with PostgreSQL](https://img.shields.io/badge/PostgreSQL-13-blue?logo=postgresql&logoColor=white)](https://www.postgresql.org/ "Go to PostgresSQL homepage") [![Made with Docker](https://img.shields.io/badge/Made_with-Docker-blue?logo=docker&logoColor=white)](https://www.docker.com/ "Go to Docker homepage")

Il progetto prevede lo sviluppo di un backend in TypeScript, gestito tramite Express, che consente di caricare dataset per l'inferenza su modelli di deep learning. Utilizzando Docker, l'architettura garantisce scalabilità ed efficienza nella gestione delle code di richieste di inferenza. Il modello di deep learning impiegato adotta un approccio a due fasi: prima rileva le persone utilizzando **YOLOv10** o **YOLOv8**, poi le classifica per determinare se si tratta di pescatori o altre persone. Gli utenti dispongono di un certo numero di token, necessari sia per l'upload dei file che per le richieste di inferenza, regolando così l'uso delle risorse del sistema.

## Funzionalità principali

- Creazione di un dataset per contenere i file da utilizzare per l'inferenza
- Eliminazione logica di un dataset
- Ottenimento della lista dei propri dataset creati
- Aggiornamento delle informazioni di un dataset
- Inserimento di contenuti all'interno di un dataset (sono ammessi immagini, video e file zip)
- Esecuzione dell'inferenza su un dataset, con possibilità di scegliere il modello per la detection e abilitare l'explainability per entrambe le fasi
- Richiesta dello stato di avanzamento di una richiesta
- Ottenimento dei risultati di un'inferenza, una volta completata
- Verifica del numero di token posseduti dall'utente
- Ricarica dei token di un utente (riservato agli utenti `admin`)

## Autenticazione e Autorizzazione

- Tutte le chiamate API richiedono l'autenticazione tramite token **JWT (JSON Web Token)**.
- Ogni utente autenticato ha un numero di token memorizzato nel database, con un valore iniziale impostato durante il seeding del database e l'aggiunta manuale degli utenti. Le funzionalità di upload di file e la richiesta di inferenza hanno un costo in termini di token.
  
    | FILE     | UPLOAD          | INFERENCE |
    | -------- | --------------- | --------- |
    | Immagine |       0.65      |    2.75   |
    | Video    |    0.4/frame    | 1.5/frame |
    | Zip      | 0.7/file valido |     /     |

- Se i token di un utente sono esauriti, ogni richiesta da parte dello stesso utente restituirà un errore **401 Unauthorized**.
- È prevista una rotta per l'utente con ruolo admin per effettuare la ricarica dei token di un utente fornendo lo username e il credito da aggiungere.

## Architettura e Design Pattern

L'architettura del progetto è composta da quattro container Docker interfacciati tra di loro:

1. **Container dell'applicativo**: Contiene l'applicazione sviluppata con Express, che gestisce le richieste degli utenti e le code tramite BullMQ.
2. **Container Redis**: Supporta BullMQ, fornendo un sistema di gestione delle code performante e affidabile.
3. **Container PostgreSQL**: Ospita il database per la memorizzazione dei dati dei dataset, degli utenti e delle richieste di inferenza.
4. **Container della rete neurale**: Contiene il modello di deep learning che esegue l'inferenza, rilevando persone e classificandole. I risultati delle inferenze vengono poi restituiti al container principale.

Inoltre, sono stati utilizzati i seguenti design pattern:

### **Singleton**:

Il pattern **Singleton**, incluso nei Creational Design Patterns, garantisce l’unicità dell’istanza di una classe, rendendola disponibile a livello globale. Questo pattern è stato adottato per stabilire una connessione univoca con il database, assicurando l’uso coerente della stessa istanza. Nello specifico, l’implementazione del Singleton si trova nel file *sequelize.ts*.

### **Chain of Responsibility (CoR)**

Il pattern **Chain of Responsibility (CoR)**, appartenente ai Behavioural Design Patterns, consente di gestire una richiesta eseguendo una serie di funzioni connesse in sequenza. In Express, il CoR si concretizza attraverso l’uso dei middleware, che fungono da anelli di una catena. Questo pattern è stato impiegato per selezionare le richieste HTTP, assicurando che solo quelle valide raggiungano il Controller; per ciascuna rotta è stata creata una catena di middleware che include:

- middleware per la verifica dell’header e del token JWT, se necessario;
- middleware specifici per la rotta, per il controllo di tipi, integrità dei dati e vincoli del database;
- middleware per la validazione dei vari payload e per il trattamento degli errori, che intervengono in caso di eccezioni negli anelli precedenti.
  La CoR è implementata nella cartella *middleware*.

### **Factory**

Nel progetto è stato adottato il pattern **Factory** per la gestione sia degli errori che delle risposte. Sono state create due factory separate: una per gli errori e una per le risposte di successo. Questo approccio consente di mantenere una chiara distinzione logica tra gli errori e le risposte andate a buon fine. La factory degli errori gestisce la creazione di messaggi di errore coerenti e standardizzati, mentre la factory delle risposte si occupa di generare risposte positive strutturate in modo uniforme. Questa distinzione migliora la manutenzione del codice e facilita il debugging e l'espansione futura del sistema. L'implementazione del pattern si trova nella cartella *factory*.

## Progettazione - UML

Di seguito vengono riportati i diagrammi UML:

- Use Case Diagram
- Sequence Diagram

![usecase]()

![POSTcreateDataset](https://github.com/Emanuele1087650/ProgrammazioneAvanzata_2024/blob/main/resources/create.png)
![POSTdeleteDataset](https://github.com/Emanuele1087650/ProgrammazioneAvanzata_2024/blob/main/resources/delete.png)
![POSTdatasets](https://github.com/Emanuele1087650/ProgrammazioneAvanzata_2024/blob/main/resources/datasets.png)
![POSTupdateDataset](https://github.com/Emanuele1087650/ProgrammazioneAvanzata_2024/blob/main/resources/update.png)
![POSTupload](https://github.com/Emanuele1087650/ProgrammazioneAvanzata_2024/blob/main/resources/upload.png)
![POSTinference](https://github.com/Emanuele1087650/ProgrammazioneAvanzata_2024/blob/main/resources/inference.png)
![POSTjob](https://github.com/Emanuele1087650/ProgrammazioneAvanzata_2024/blob/main/resources/job.png)
![POSTresults](https://github.com/Emanuele1087650/ProgrammazioneAvanzata_2024/blob/main/resources/results.png)
![POSTtokens](https://github.com/Emanuele1087650/ProgrammazioneAvanzata_2024/blob/main/resources/tokens.png)
![POSTrecharge](https://github.com/Emanuele1087650/ProgrammazioneAvanzata_2024/blob/main/resources/recharge.png)

## Esempi di Chiamate API

| TIPO | ROTTA                 | JWT |
| ---- | --------------------- | --- |
| POST | /createDataset        | Sì  |
| POST | /deleteDataset        | Sì  |
| POST | /datasets             | Sì  |
| POST | /updateDataset        | Sì  |
| POST | /upload               | Sì  |
| POST | /inference            | Sì  |
| POST | /job                  | Sì  |
| POST | /results              | Sì  |
| POST | /tokens               | Sì  |
| POST | /rechage              | Si  |

### - Creazione di un nuovo dataset

**Rotta:** `POST /createDataset`

**Body della richiesta:**

- `name`: nome del dataset che si vuole creare

Esempio di **body:**

```json
{
  "name": "dataset"
}
```

### - Eliminazione (logica) di un dataset

**Rotta:** `POST /deleteDataset`

**Body della richiesta:**

- `name`: nome del dataset che si vuole eliminare

Esempio di **body:**

```json
{
  "name": "dataset"
}
```

### - Lista dei dataset creati

**Rotta:** `POST /datasets`

Per questa rotta è necessaria soltanto l'autenticazione, ma non la specificazione di parametri all'interno del body

### - Aggiornamento del nome di un dataset

**Rotta:** `POST /updateDataset`

**Body della richiesta:**

- `name`: dataset di cui si vuole aggiornare il nome
- `new_name`: nuovo nome

Esempio di **body:**

```json
{
  "name": "dataset",
  "new_name": "dataset1"
}
```

### - Caricamento di file all'interno di un dataset

**Rotta:** `POST /upload`

**Body della richiesta (formato form-data):**

- `name (text)`: dataset in cui si vogliono caricare i file
- `dataset (file)`: dataset da caricare (immagini, video e zip)

**Vincoli di formato**
- `video`: MP4
- `zip`: lo zip non può contenere cartelle o file di formato non valido.

### - Inferenza su un dataset specifico

**Rotta:** `POST /inference`

**Body della richiesta:**

- `dataset`: dataset su cui fare inferenza
- `model`: modello da usare per l'inferenza. Valori accettati: `v8` o `v10`
- `cam_det`: abilitazione di GradCAM per la detection. Valori accettati: `True` o `False`
- `cam_cls`: abilitazione di EigenCAM per la classificazione. Valori accettati: `True` o `False`

Esempio di **body:**

```json
{
  "dataset": "dataset1",
  "model": "v10",
  "cam_det": "False",
  "cam_cls": "False"
}
```

### - Verifica dello stato di processamento di una inferenza

**Rotta:** `POST /job`

**Body della richiesta:**

- `jobId`: id del job di cui si vuole verificare lo stato di processamento

Esempio di **body:**

```json
{
  "jobId": 1,
}
```

### - Risultato di una inferenza

**Rotta:** `POST /results`

**Body della richiesta:**

- `jobId`: id del job di cui si vuole avere il risultato

Esempio di **body:**

```json
{
  "jobId": 1,
}
```

### - Token disponibili

**Rotta:** `POST /tokens`

Per questa rotta è necessaria soltanto l'autenticazione, ma non la specificazione di parametri all'interno del body

### - Ricarica dei token di un utente

La seguente rotta è disponibile solo per gli utenti di tipo **admin**

**Rotta:** `POST /recharge`

**Body della richiesta:**

- `user`: username dell'utente di cui si vogliono ricaricare i token
- `tokens`: somma da ricaricare

Esempio di **body:**

```json
{
  "user": "user1",
  "tokens": 20
}
```

## Utilizzo

### Requisiti:

Per prima cosa è necessario avere `Docker` installato. Nel caso non lo fosse, si può procedere all'installazione dal seguente [link](https://www.docker.com/).

### Procedura di avvio:

Verificare di avere `git` installato e clonare la repository mediante il seguente comando:
```bash
$ git clone https://github.com/Emanuele1087650/ProgrammazioneAvanzata_2024
```

Successivamente, spostarsi all'interno della cartella di lavoro:
```bash
$ cd ProgrammazioneAvanzata_2024
```

Creare, all'interno della root del progetto, un file ".env" con la seguente struttura:

```
DB_NAME=postgres
DB_USER=postgres
DB_PASS=root
DB_HOST=localhost
DB_PORT=5432
API_PORT=3000
TZ=Europe/Rome
JWT_KEY=mysecretkey
REDIS_HOST=cache
REDIS_PORT=6379
CV_HOST=cv
CV_PORT=8000
```

E' necessario sostituire il valore di "JWT_KEY" con la chiave con la quale verranno generati i token JWT.

Avviare il servizio Docker tramite il comando:
```bash
$ docker-compose up
```
Questa fase può richiedere alcuni minuti per via della dimensione dell'immagine contenente la rete neurale.

Al primo avvio del servizio tramite Docker, al fine di poter utilizzare l'app, il database verrà popolato con alcuni `user` (per maggiori info si rimanda al file `seed.sql`).

Eseguire le richieste sulla porta 3000 tramite cURL o Postman

### Rimozione

Per rimuovere correttamente i container, eseguire il seguente comando in modo da eliminare anche i volumi creati:
```bash
$ docker-compose down -v
```

## Test del progetto

Si può procedere con l’esecuzione di una serie di test già configurati importando, all'interno di Postman, la collection `PA2024_postman_collection.json` che si trova nella directory principale del repository. I token JWT inclusi sono stati creati utilizzando la chiave ‘mysecretkey’.

## Note

### Software utilizzati

- [Visual Studio Code](https://code.visualstudio.com/) - IDE di sviluppo

- [Docker](https://www.docker.com/) - Piattaforma per la gestione di container

- [Postman](https://www.postman.com/) - Piattaforma per le chiamate API

- [DBeaver](https://dbeaver.io/) - Software per interfacciarsi con il database PostgreSQL

## Contributors

| Contributor Name      | GitHub                                  |
|:----------------------|:----------------------------------------|
| ⭐ **Biccheri Emanuele**  | [Click here](https://github.com/Emanuele1087650) |
| ⭐ **De Ritis Riccardo**   | [Click here](https://github.com/RiccardoDR) |

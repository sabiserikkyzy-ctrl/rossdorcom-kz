# Настройка заявок ROSSDORCOM

Форма отправляет данные только на серверный endpoint `/api/contact`. Endpoint сначала сохраняет заявку в Google Sheets и только после успешной записи пытается отправить уведомление через Resend. Если письмо не отправится, строка в таблице останется сохранённой.

## 1. Google Sheet

1. Создайте новую Google-таблицу или выберите существующую таблицу для заявок.
2. Первая вкладка будет использоваться как база лидов. Endpoint автоматически проверит и заполнит строку `A1:H1` такими заголовками:

   `ID | Дата и время | Имя | Телефон | Задача | Страница | Статус | Комментарий`

3. Сотрудники могут вручную менять `Статус` на `Новая`, `В работе`, `Связались` или `Закрыта` и заполнять `Комментарий`.
4. Spreadsheet ID находится в URL таблицы между `/d/` и `/edit`:

   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

## 2. Google Sheets API и service account

1. Откройте [Google Cloud Console](https://console.cloud.google.com/) и создайте или выберите проект.
2. Перейдите в **APIs & Services → Library**, найдите **Google Sheets API** и нажмите **Enable**.
3. Перейдите в **IAM & Admin → Service Accounts** и создайте service account, например `rossdorcom-website-leads`.
4. Скопируйте email service account вида `name@project-id.iam.gserviceaccount.com`.
5. Внутри service account откройте **Keys → Add key → Create new key → JSON**. JSON-файл содержит `client_email` и `private_key`. Не добавляйте этот файл в репозиторий.
6. Откройте Google Sheet, нажмите **Share** и добавьте service-account email с правом **Editor**. Без этого API не сможет добавлять строки.

## 3. Vercel Environment Variables для Google

В Vercel откройте проект `rossdorcom-kz` → **Settings → Environment Variables**. Добавьте значения как минимум для **Preview**, а перед production-запуском отдельно для **Production**:

- `GOOGLE_SHEETS_SPREADSHEET_ID` — ID из URL Google Sheet.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — значение `client_email` из JSON-ключа.
- `GOOGLE_PRIVATE_KEY` — полное значение `private_key`, включая строки `BEGIN PRIVATE KEY` и `END PRIVATE KEY`. В Vercel его можно вставить многострочно. Если значение хранится одной строкой, переводы строк должны быть записаны как `\n`; endpoint преобразует их обратно.

После добавления или изменения переменных создайте новый Preview deployment: существующий deployment не получает новые env автоматически.

## 4. Resend

1. Создайте аккаунт в [Resend](https://resend.com/) и добавьте домен, с которого будут отправляться уведомления.
2. Добавьте DNS-записи, предложенные Resend, и дождитесь статуса **Verified**.
3. Создайте API key с правом отправки писем.
4. Добавьте в Vercel:

- `RESEND_API_KEY` — созданный API key.
- `CONTACT_FROM_EMAIL` — отправитель на подтверждённом домене, например `ROSSDORCOM Website <site@rossdorcom.kz>`.

Получатель зафиксирован сервером: `info@rossdorcom.kz`. Тема письма: `Новая заявка с сайта ROSSDORCOM KZ`.

Если Google Sheets настроен, а Resend ещё нет или отправка временно завершилась ошибкой, заявка всё равно считается принятой: строка уже находится в основной базе. Ошибка Resend записывается только в server logs.

## 5. Проверка

1. Разверните Preview с настроенными Preview env variables.
2. Отправьте тестовую заявку с легко узнаваемым именем, например `TEST — management preview`.
3. Убедитесь, что в таблице появилась строка с ID вида `RDC-YYYYMMDD-XXXXXXXX`, временем Asia/Almaty, исходной страницей, статусом `Новая` и пустым комментарием.
4. Проверьте письмо на `info@rossdorcom.kz`.
5. После проверки тестовую строку можно удалить вручную из Google Sheet.

Локальная команда для серверной логики:

```bash
npm run test:contact
```

Vite Preview проверяет frontend, но сам по себе не эмулирует Vercel Functions. Для полного локального вызова `/api/contact` используйте Vercel CLI с теми же переменными или проверяйте уже созданный Vercel Preview.

 // Токен из интеграции, получил через authorization_code
 const accessToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImFiMDdlNWEzODkxOTYyYmM1ODI4MmQ0OGY3OWJiMmRhZjU1YzFmODYwODBkMGMwNjIzMzVmNzU3YTQyYzg0NDViOGMzYmZhNmQ5NmU5OTA4In0.eyJhdWQiOiJmNDk2YjhkYi02ZjZhLTQzNDktYmJjMi1hNzJkYjYwYjA0NTYiLCJqdGkiOiJhYjA3ZTVhMzg5MTk2MmJjNTgyODJkNDhmNzliYjJkYWY1NWMxZjg2MDgwZDBjMDYyMzM1Zjc1N2E0MmM4NDQ1YjhjM2JmYTZkOTZlOTkwOCIsImlhdCI6MTc0MTY3MzY1MCwibmJmIjoxNzQxNjczNjUwLCJleHAiOjE3NDMzNzkyMDAsInN1YiI6IjEyMjIwNTIyIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMyMjc4OTY2LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiYjA5YjVhMTAtOTBhNi00Y2EzLTk0YTktN2M2Zjk5MGFiYmE4IiwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.MpvQ8NUE-WSnzVvtBKQwaF6DsEAzhm3UZfWM-Phs7PtaasNnmjRGxnA-tL3MLsO1QkPNjOTp9sEb3CR6WbOnW95qFbSkwxaEGWbNciH9T6kZ7Ns40KytDwbeBXSIYiePbV5gN6BcRLadw_6wgnLvqNa_V3rYc3oZuz7Q28DDLgamrbrpphaBORxbDG9rgu4qeDnvgsi8GfG6ZxgrDk5vRw-oB46aiL75hHpq4EsYHrl36RKLQAuqtovbgcXjeJm8SPNI-bXrPR3T9iDTldE8SqtYFJrQKdMquOw7o0GRKHKrZLTVzIQGrORZT3BK6KQ0D1xcXcbGz8GHXT02tSTpsQ";
 const apiUrl = "https://zeynalramin98.amocrm.ru/api/v4/leads";

 // Логируем ошибки, чтобы видеть, что пошло не так
 function logError(message) {
   document.getElementById("errorLog").innerText = message;
   console.error("Ой, что-то сломалось: ", message);
 }

 // Следим за временем последнего запроса, чтобы не превышать лимит
 let lastRequestTime = 0;

 // Функция для запросов с задержкой в 1 секунду
 async function fetchWithDelay(url) {
    const now = Date.now();
    const delay = 1000; // 1 секунда, как просили в задании
    if (now - lastRequestTime < delay) {
      await new Promise(resolve => setTimeout(resolve, delay - (now - lastRequestTime)));
    }
  
    console.log("Делаю запрос: ", url);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Сервер ответил ошибкой: ${response.status} - ${errorText}`);
      }
  
      // Проверяем, есть ли тело ответа
      const text = await response.text();
      lastRequestTime = Date.now();
      if (!text) {
        console.log("Ответ пустой, возвращаю null");
        return null; // Пустой ответ — это нормально для некоторых случаев
      }
  
      const data = JSON.parse(text);
      console.log("Получил данные: ", data);
      return data;
    } catch (error) {
      logError(`Проблема с запросом ${url}: ${error.message}`);
      return null;
    }
  }

 // Собираем все сделки с пагинацией
 async function fetchDeals() {
   console.log("Начинаю грузить сделки...");
   let page = 1;
   let allDeals = [];
   let hasMore = true;

   while (hasMore) {
     const data = await fetchWithDelay(`${apiUrl}?limit=2&page=${page}&with=contacts`);
     if (!data || !data._embedded || !data._embedded.leads) {
       console.log("Данные не пришли, заканчиваю");
       hasMore = false;
     } else {
       const leads = data._embedded.leads;
       if (leads.length === 0) {
         console.log("Сделок больше нет");
         hasMore = false;
       } else {
         allDeals = allDeals.concat(leads);
         page++;
         hasMore = !!data._links?.next; // Проверяем, есть ли следующая страница
       }
     }
   }

   console.log("Все сделки собраны: ", allDeals);
   renderDeals(allDeals);
 }

 // Рендерим таблицу со сделками
 async function renderDeals(deals) {
   const tableBody = document.getElementById("deals-table-body");
   tableBody.innerHTML = ""; // Очищаем таблицу перед рендером

   if (!deals.length) {
     logError("Сделок нет, таблица будет пустая");
     return;
   }

   for (const deal of deals) {
     const status = await determineTaskStatus(deal.id);

     // Проверяем, есть ли контакт, и запрашиваем его данные
     let contactName = "Нет контакта";
     let contactPhone = "Нет телефона";
     if (deal._embedded && deal._embedded.contacts && deal._embedded.contacts.length > 0) {
       const contactId = deal._embedded.contacts[0].id;
       const contactData = await fetchWithDelay(`https://zeynalramin98.amocrm.ru/api/v4/contacts/${contactId}`);
       if (contactData) {
         contactName = contactData.name || "Без имени";
         const phoneField = contactData.custom_fields_values?.find(field => field.field_code === "PHONE");
         contactPhone = phoneField ? phoneField.values[0].value : "Телефона нет";
       }
     }

     // Создаем строку таблицы
     const row = document.createElement("tr");
     row.innerHTML = `
       <td>${deal.id}</td>
       <td>${deal.name}</td>
       <td>${deal.price || 0}</td>
       <td>${contactName}</td>
       <td>${contactPhone}</td>
       <td><span class="status-circle" style="background-color: ${status}"></span></td>
     `;
     row.onclick = () => toggleDealDetails(row, deal.id); // Клик по строке
     tableBody.appendChild(row);
   }
 }

 // Показываем/скрываем детали сделки
 async function toggleDealDetails(row, dealId) {
   // Если уже есть детали, убираем их
   if (row.nextElementSibling && row.nextElementSibling.classList.contains("deal-details")) {
     row.nextElementSibling.remove();
     return;
   }

   // Закрываем все открытые детали
   document.querySelectorAll(".deal-details").forEach(el => el.remove());

   // Добавляем спиннер пока грузятся данные
   const detailsRow = document.createElement("tr");
   detailsRow.classList.add("deal-details");
   detailsRow.innerHTML = `
     <td colspan="6">
       <div class="loading-spinner" style="display: block;">
         <div class="spinner-border text-primary" role="status">
           <span class="visually-hidden">Загрузка...</span>
         </div>
       </div>
       <div class="details-content"></div>
     </td>
   `;
   row.insertAdjacentElement("afterend", detailsRow);

   // Запрашиваем данные сделки
   const deal = await fetchWithDelay(`${apiUrl}/${dealId}`);
   if (!deal) {
     detailsRow.querySelector(".loading-spinner").style.display = "none";
     detailsRow.querySelector(".details-content").innerHTML = "<p>Не удалось загрузить данные</p>";
     return;
   }

   const status = await determineTaskStatus(dealId);
   const taskDate = deal.closest_task_at
     ? new Date(deal.closest_task_at * 1000).toLocaleDateString("ru-RU")
     : "Нет задачи";

   // Показываем детали
   detailsRow.querySelector(".loading-spinner").style.display = "none";
   detailsRow.querySelector(".details-content").innerHTML = `
     <p><strong>Название:</strong> ${deal.name}</p>
     <p><strong>ID:</strong> ${deal.id}</p>
     <p><strong>Дата задачи:</strong> ${taskDate}</p>
     <p><strong>Статус:</strong> <span class="status-circle" style="background-color: ${status}"></span></p>
   `;
 }

 // Определяем цвет статуса задачи
 async function determineTaskStatus(dealId) {
   const tasksUrl = `https://zeynalramin98.amocrm.ru/api/v4/tasks?filter[entity_id]=${dealId}&filter[entity_type]=leads&order[complete_till]=asc`;
   const data = await fetchWithDelay(tasksUrl);

   if (!data || !data._embedded || !data._embedded.tasks || !data._embedded.tasks.length) {
     console.log(`Для сделки ${dealId} задач нет`);
     return "red"; // Нет задач — красный
   }

   const task = data._embedded.tasks[0];
   const taskDate = new Date(task.complete_till * 1000);
   const today = new Date();
   today.setHours(0, 0, 0, 0); // Обнуляем время для сравнения

   if (taskDate < today) return "red"; // Просрочено
   if (taskDate.toDateString() === today.toDateString()) return "green"; // Сегодня
   return "yellow"; // Будущее
 }

 // Запускаем загрузку
 fetchDeals();
# API Endpoint Implementation Plan: (Webhook) POST /subscriptions/stripe-webhook

## 1. Przegląd punktu końcowego
Endpoint (Webhook) POST /subscriptions/stripe-webhook służy do odbierania eventów od Stripe, które informują o aktualizacji statusu subskrypcji. Eventy te mogą dotyczyć m.in. udanej płatności, nieudanej transakcji czy innych zmian związanych z fakturowaniem. Na podstawie przesłanych danych system będzie aktualizował status subskrypcji użytkownika.

## 2. Szczegóły żądania
- **Metoda HTTP:** POST
- **Struktura URL:** /subscriptions/stripe-webhook
- **Request Body:** Zawiera dane eventu przesłane przez Stripe w formacie JSON. Przykładowy payload:
  ```json
  {
    "id": "evt_123",
    "object": "event",
    "api_version": "2020-08-27",
    "created": 1609459200,
    "data": { ... },
    "type": "invoice.payment_succeeded"
  }
  ```
- **Authentication:**
  - Nie jest wymagane uwierzytelnianie JWT, gdyż eventy pochodzą bezpośrednio od Stripe.
  - Weryfikacja autentyczności odbywa się poprzez nagłówek `Stripe-Signature` oraz porównanie z tajnym kluczem webhook.

## 3. Wykorzystywane typy
- **DTO/Model:** Nie ma dedykowanego modelu; eventy mogą być parsowane jako obiekt JSON lub mapowane do dedykowanego interfejsu w zależności od potrzeb.
- **Command Model:** Nie jest wymagany, ponieważ dane przychodzą bezpośrednio od Stripe.

## 4. Szczegóły odpowiedzi
- **200 OK:** Zwracane po prawidłowym przetworzeniu eventu przez system.
- **Kody błędów:**
  - **400 Bad Request:** Zwracany, gdy dane eventu są nieprawidłowe lub nie uda się zweryfikować autentyczności eventu.

## 5. Przepływ danych
1. Stripe wysyła event na endpoint /subscriptions/stripe-webhook jako żądanie POST.
2. Middleware weryfikuje autentyczność eventu, sprawdzając nagłówek `Stripe-Signature` przy użyciu tajnego klucza webhook.
3. Kontroler odbiera event i przekazuje dane do warstwy serwisowej.
4. Warstwa serwisowa analizuje typ eventu (np. `invoice.payment_succeeded`, `invoice.payment_failed`) i wykonuje odpowiednie działania:
   - Aktualizacja statusu subskrypcji w bazie danych (zgodnie z `db-plan.md`).
   - W razie potrzeby inicjacja dodatkowych akcji (np. wysłanie powiadomienia do użytkownika).
5. Po pomyślnym przetworzeniu eventu, system zwraca odpowiedź 200 OK.
6. W przypadku wystąpienia błędów (np. nieprawidłowy payload, problem z weryfikacją sygnatury), zwracany jest kod 400 Bad Request i błąd jest logowany.

## 6. Względy bezpieczeństwa
- Weryfikacja autentyczności eventu poprzez sprawdzenie nagłówka `Stripe-Signature` i użycie tajnego klucza webhook.
- Brak konieczności uwierzytelniania JWT, ponieważ tylko Stripe wysyła requesty na ten endpoint.
- Walidacja danych eventu, aby zapobiec przetwarzaniu fałszywych lub zmodyfikowanych danych.

## 7. Obsługa błędów
- **400 Bad Request:** Zwracany, gdy dane eventu są nieprawidłowe, nieudana jest weryfikacja sygnatury lub występuje inny błąd związany z przetwarzaniem eventu.
- Wszystkie błędy muszą być logowane (np. do tabeli `audit_logs` lub systemu monitoringu) z odpowiednimi szczegółami, aby umożliwić analizę przyczyn nieprawidłowego przetwarzania.

## 8. Rozważania dotyczące wydajności
- Przetwarzanie eventów powinno być zoptymalizowane, aby szybko zwracać potwierdzenie 200 OK dla Stripe.
- W przypadku dużego natężenia eventów, rozważenie kolejkowania i asynchronicznego przetwarzania, aby uniknąć opóźnień.
- Minimalizacja opóźnień w komunikacji, aby Stripe nie wysłał ponownie eventu z powodu braku potwierdzenia.

## 9. Etapy wdrożenia
1. Utworzenie endpointu (Webhook) POST /subscriptions/stripe-webhook w warstwie kontrolera.
2. Implementacja middleware do weryfikacji autentyczności eventów (sprawdzenie `Stripe-Signature`).
3. Parsowanie i walidacja danych eventu zgodnie z dokumentacją Stripe.
4. Implementacja logiki serwisowej odpowiedzialnej za aktualizację statusu subskrypcji na podstawie typu eventu.
5. Pisanie testów integracyjnych, symulujących różne scenariusze eventów (np. `invoice.payment_succeeded`, `invoice.payment_failed`).
6. Code review oraz wdrożenie na środowisko testowe.
7. Monitorowanie działania endpointu i optymalizacja przetwarzania eventów w przypadku wysokiego natężenia ruchu. 
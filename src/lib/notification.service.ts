import type { AlertDTO } from '../types';
import type { Json } from '../db/database.types';
import { supabaseClient } from '../db/supabase.client';

/**
 * Serwis obsługujący asynchroniczne powiadomienia (email, Telegram)
 */
export class NotificationService {
  
  /**
   * Wysyła powiadomienie o nowym alercie (asynchronicznie)
   * Ta funkcja jest wywoływana w tle, nie blokuje głównego przepływu żądania
   */
  static async sendAlertNotification(alert: AlertDTO): Promise<void> {
    try {
      // Pobranie ustawień powiadomień użytkownika
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('email, first_name, notification_settings')
        .eq('id', alert.user_id)
        .single();

      if (userError || !user) {
        console.error('Failed to fetch user for notification:', userError);
        return;
      }

      const notificationSettings = user.notification_settings as any;
      
      // Sprawdzenie czy użytkownik ma włączone powiadomienia
      if (!notificationSettings?.alerts_enabled) {
        console.log(`User ${alert.user_id} has notifications disabled`);
        return;
      }

      // Pobranie nazw assetu i giełdy dla lepszego komunikatu
      const [assetResult, exchangeResult] = await Promise.all([
        supabaseClient.from('assets').select('symbol, full_name').eq('id', alert.asset_id).single(),
        supabaseClient.from('exchanges').select('name').eq('id', alert.exchange_id).single()
      ]);

      const assetName = assetResult.data?.symbol || alert.asset_id;
      const exchangeName = exchangeResult.data?.name || alert.exchange_id;

      // Przygotowanie danych do powiadomienia
      const notificationData = {
        user_name: user.first_name || 'User',
        asset_name: assetName,
        exchange_name: exchangeName,
        spread: alert.spread,
        timestamp: alert.timestamp,
        alert_id: alert.id
      };

      // Wysłanie powiadomień równolegle
      const promises: Promise<void>[] = [];

      if (notificationSettings?.email_enabled) {
        promises.push(this.sendEmailNotification(user.email, notificationData));
      }

      if (notificationSettings?.telegram_enabled && notificationSettings?.telegram_chat_id) {
        promises.push(this.sendTelegramNotification(notificationSettings.telegram_chat_id, notificationData));
      }

      // Wykonanie wszystkich powiadomień równolegle
      await Promise.allSettled(promises);

      // Aktualizacja statusu wysyłania alertu
      await supabaseClient
        .from('alerts')
        .update({ send_status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', alert.id);

    } catch (error) {
      console.error('Error sending alert notification:', error);
      
      // Aktualizacja statusu na błąd
      await supabaseClient
        .from('alerts')
        .update({ send_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', alert.id);
    }
  }

  /**
   * Wysyła powiadomienie email
   */
  private static async sendEmailNotification(
    email: string, 
    data: {
      user_name: string;
      asset_name: string;
      exchange_name: string;
      spread: number;
      timestamp: string;
      alert_id: string;
    }
  ): Promise<void> {
    try {
      // W rzeczywistej implementacji tutaj byłaby integracja z serwisem email
      // np. SendGrid, AWS SES, Resend, etc.
      
      const emailContent = {
        to: email,
        subject: `🚨 New Arbitrage Alert: ${data.asset_name} on ${data.exchange_name}`,
        html: `
          <h2>Hello ${data.user_name}!</h2>
          <p>We found a new arbitrage opportunity:</p>
          <ul>
            <li><strong>Asset:</strong> ${data.asset_name}</li>
            <li><strong>Exchange:</strong> ${data.exchange_name}</li>
            <li><strong>Spread:</strong> ${data.spread.toFixed(4)}%</li>
            <li><strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}</li>
          </ul>
          <p>Alert ID: ${data.alert_id}</p>
          <p>Happy trading! 📈</p>
        `
      };

      // Placeholder dla rzeczywistej implementacji email
      console.log('Email notification prepared:', emailContent);
      
      // Tutaj byłoby wywołanie rzeczywistego API email:
      // await emailProvider.send(emailContent);
      
    } catch (error) {
      console.error('Failed to send email notification:', error);
      throw error;
    }
  }

  /**
   * Wysyła powiadomienie Telegram
   */
  private static async sendTelegramNotification(
    chatId: string,
    data: {
      user_name: string;
      asset_name: string;
      exchange_name: string;
      spread: number;
      timestamp: string;
      alert_id: string;
    }
  ): Promise<void> {
    try {
      const message = `
🚨 *New Arbitrage Alert*

💰 *Asset:* ${data.asset_name}
🏢 *Exchange:* ${data.exchange_name}
📊 *Spread:* ${data.spread.toFixed(4)}%
⏰ *Time:* ${new Date(data.timestamp).toLocaleString()}

Alert ID: \`${data.alert_id}\`

Happy trading! 📈
      `.trim();

      // Placeholder dla rzeczywistej implementacji Telegram
      console.log('Telegram notification prepared:', { chatId, message });
      
      // Tutaj byłoby wywołanie Telegram Bot API:
      // const telegramBotToken = import.meta.env.TELEGRAM_BOT_TOKEN;
      // await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     chat_id: chatId,
      //     text: message,
      //     parse_mode: 'Markdown'
      //   })
      // });
      
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      throw error;
    }
  }

  /**
   * Dodaje alert do kolejki powiadomień (w tle)
   * Ta funkcja nie blokuje głównego przepływu żądania
   */
  static scheduleNotification(alert: AlertDTO): void {
    // Uruchomienie w następnym tick'u event loop (asynchronicznie)
    setImmediate(() => {
      this.sendAlertNotification(alert).catch(error => {
        console.error('Background notification failed:', error);
      });
    });
  }
} 
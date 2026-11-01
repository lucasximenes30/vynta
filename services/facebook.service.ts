import * as bizSdk from 'facebook-nodejs-business-sdk';

export interface FacebookEventData {
  email?: string;
  phone?: string;
  externalId?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
  currency?: string;
  value?: number;
  eventId?: string;
}

export class FacebookService {
  private static isInitialized = false;

  private static initialize() {
    if (this.isInitialized) return;

    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn('FACEBOOK_ACCESS_TOKEN is not defined in environment variables.');
      return;
    }

    bizSdk.FacebookAdsApi.init(accessToken);
    this.isInitialized = true;
  }

  /**
   * Sends a standard or custom event to the Facebook Conversions API (CAPI)
   * @param eventName Name of the event (e.g., 'PageView', 'CompleteRegistration', 'InitiateCheckout', 'Purchase')
   * @param eventData User and custom data for the event
   * @param sourceUrl The public URL where the event occurred
   */
  static async sendEvent(eventName: string, eventData: FacebookEventData = {}, sourceUrl?: string) {
    this.initialize();

    const pixelId = process.env.FACEBOOK_PIXEL_ID || process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
    if (!pixelId || !this.isInitialized) {
      console.warn('Facebook Pixel ID or Access Token is missing. Event will not be sent.');
      return;
    }

    const { ServerEvent, EventRequest, UserData, CustomData } = bizSdk;

    const userData = new UserData();

    if (eventData.email) {
      userData.setEmails([eventData.email.trim().toLowerCase()]);
    }
    if (eventData.phone) {
      userData.setPhones([eventData.phone.replace(/\D/g, '')]);
    }
    if (eventData.externalId) {
      userData.setExternalIds([String(eventData.externalId)]);
    }
    if (eventData.clientIpAddress) {
      userData.setClientIpAddress(eventData.clientIpAddress);
    }
    if (eventData.clientUserAgent) {
      userData.setClientUserAgent(eventData.clientUserAgent);
    }
    if (eventData.fbp) {
      userData.setFbp(eventData.fbp);
    }
    if (eventData.fbc) {
      userData.setFbc(eventData.fbc);
    }

    // Never leak internal webhook secrets or API paths in event_source_url
    let cleanSourceUrl = 'https://www.vynta.digital';
    if (sourceUrl) {
      try {
        const parsed = new URL(sourceUrl);
        parsed.searchParams.delete('webhookSecret');
        cleanSourceUrl = parsed.pathname.startsWith('/api/')
          ? `${parsed.origin}/`
          : parsed.toString();
      } catch {
        cleanSourceUrl = 'https://www.vynta.digital';
      }
    }

    const serverEvent = new ServerEvent()
      .setEventName(eventName)
      .setEventTime(Math.floor(Date.now() / 1000))
      .setUserData(userData)
      .setEventSourceUrl(cleanSourceUrl)
      .setActionSource('website');

    if (eventData.eventId) {
      serverEvent.setEventId(eventData.eventId);
    }

    if (typeof eventData.value === 'number') {
      const customData = new CustomData()
        .setCurrency(eventData.currency || 'BRL')
        .setValue(eventData.value);
      serverEvent.setCustomData(customData);
    }

    const eventsData = [serverEvent];
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN as string;
    const eventRequest = new EventRequest(accessToken, pixelId, eventsData);

    try {
      const response = await eventRequest.execute();
      console.log(`Facebook CAPI Event '${eventName}' sent successfully.`, response);
      return response;
    } catch (error) {
      console.error(`Error sending Facebook CAPI Event '${eventName}':`, error);
      throw error;
    }
  }
}

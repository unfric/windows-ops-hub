import { supabase } from "@/integrations/supabase/client";

/**
 * Standardized API wrapper for Supabase Edge Functions.
 */
export const api = {
  orders: {
    /**
     * Fetches all orders with aggregated metadata.
     */
    list: async () => {
      const { data, error } = await supabase.functions.invoke('orders-api', {
        body: { action: 'list' }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Fetches a single order by ID.
     */
    get: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('orders-api', {
        body: { action: 'get', id }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Creates a new order.
     */
    create: async (orderData: any) => {
      const { data, error } = await supabase.functions.invoke('orders-api', {
        body: { action: 'create', data: orderData }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Updates an existing order.
     */
    update: async (id: string, orderData: any) => {
      const { data, error } = await supabase.functions.invoke('orders-api', {
        body: { action: 'update', id, data: orderData }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Updates a single field and triggers server-side logging.
     */
    updateField: async (id: string, field: string, value: any, moduleName: string) => {
      const { data, error } = await supabase.functions.invoke('orders-api', {
        body: { action: 'update-field', id, field, value, module: moduleName }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Adds a log entry to a child table (e.g., payment_logs).
     */
    addLog: async (table: string, logData: any) => {
      const { data, error } = await supabase.functions.invoke('orders-api', {
        body: { action: 'add-log', table, data: logData }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Updates an existing log entry in a child table.
     */
    updateLog: async (table: string, id: string, logData: any) => {
      const { data, error } = await supabase.functions.invoke('orders-api', {
        body: { action: 'update-log', table, id, data: logData }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Deletes a log entry from a child table.
     */
    deleteLog: async (table: string, id: string) => {
      const { data, error } = await supabase.functions.invoke('orders-api', {
        body: { action: 'delete-log', table, id }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Deletes an order (Admin/Owner only).
     */
    delete: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('orders-api', {
        body: { action: 'delete', id }
      });
      if (error) throw error;
      return data;
    }
  },

  users: {
    /**
     * Fetches roles for the current user.
     */
    getRoles: async () => {
      const { data, error } = await supabase.functions.invoke('users-api', {
        body: { action: 'get-roles' }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Fetches the current user's profile (name, avatar, etc).
     */
    getProfile: async () => {
      const { data, error } = await supabase.functions.invoke('users-api', {
        body: { action: 'get-profile' }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Lists all users (Admin only).
     */
    list: async () => {
      const { data, error } = await supabase.functions.invoke('users-api', {
        body: { action: 'list' }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Invites a new user by email and assigns initial roles.
     */
    invite: async (data: { email: string; name?: string; roles?: string[] }) => {
      const { data: result, error } = await supabase.functions.invoke('users-api', {
        body: { action: 'invite', data }
      });
      if (error) throw error;
      return result;
    },

    /**
     * Updates user profile and roles (Admin only).
     */
    update: async (id: string, updateData: { profile?: any; roles?: string[] }) => {
      const { data, error } = await supabase.functions.invoke('users-api', {
        body: { action: 'update', id, data: updateData }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Deletes a user account (Admin only).
     */
    delete: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('users-api', {
        body: { action: 'delete', id }
      });
      if (error) throw error;
      return data;
    }
  },

  settings: {
    /**
     * Lists all system settings and configuration lists.
     */
    list: async () => {
      const { data, error } = await supabase.functions.invoke('settings-api', {
        body: { action: 'list' }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Upserts a setting or config item.
     */
    upsert: async (table: string, payload: any) => {
      const { data, error } = await supabase.functions.invoke('settings-api', {
        body: { action: 'upsert', table, data: payload }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Deletes a config item.
     */
    delete: async (table: string, id: string) => {
      const { data, error } = await supabase.functions.invoke('settings-api', {
        body: { action: 'delete', table, id }
      });
      if (error) throw error;
      return data;
    }
  },

  logs: {
    /**
     * Fetches activity or audit logs with optional filters.
     */
    fetch: async (type: 'audit' | 'activity', filters?: { order_id?: string; module?: string; limit?: number }) => {
      const { data, error } = await supabase.functions.invoke('logs-api', {
        body: { action: 'fetch', type, filters }
      });
      if (error) throw error;
      return data;
    }
  },

  notifications: {
    /**
     * Lists current user's notifications.
     */
    list: async () => {
      const { data, error } = await supabase.functions.invoke('notifications-api', {
        body: { action: 'list' }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Marks a notification as read.
     */
    markRead: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('notifications-api', {
        body: { action: 'mark-read', id }
      });
      if (error) throw error;
      return data;
    },

    /**
     * Marks all user notifications as read.
     */
    markAllRead: async () => {
      const { data, error } = await supabase.functions.invoke('notifications-api', {
        body: { action: 'mark-all-read' }
      });
      if (error) throw error;
      return data;
    }
  }
};

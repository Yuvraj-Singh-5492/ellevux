// Supabase Configuration for Ellevux
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://lndkbsdkflpydpkfpkny.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuZGtic2RrZmxweWRwa2Zwa255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjE3ODIsImV4cCI6MjA5MjU5Nzc4Mn0.k_fdIRxpsX20SqvoxYHmF_V6pDmXS-3QQGgPVNDTiLc';

let _supabase;

// Check if credentials are mock/placeholder credentials
const isMockMode = !SUPABASE_URL || SUPABASE_URL.includes('your-project-id') || SUPABASE_ANON_KEY.startsWith('sb_');

if (isMockMode) {
  console.log("%cEllevux Console Running in Local Mock Mode (using LocalStorage)", "color: #8a2be2; font-weight: bold; font-size: 14px;");
  
  // Seed initial mock database if empty
  if (!localStorage.getItem('ellevux_users')) {
    localStorage.setItem('ellevux_users', JSON.stringify([]));
  }
  if (!localStorage.getItem('ellevux_session')) {
    localStorage.setItem('ellevux_session', 'null');
  }
  if (!localStorage.getItem('ellevux_agents')) {
    // Seed some mock agents
    const mockAgents = [
      { id: '1', name: 'Jessica', voice_id: 'jessica_v4', user_id: 'mock-user-id', status: 'online', created_at: new Date(Date.now() - 3600000 * 2).toISOString(), valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '2', name: 'Marcus', voice_id: 'marcus_v2', user_id: 'mock-user-id', status: 'online', created_at: new Date(Date.now() - 3600000 * 24).toISOString(), valid_until: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '3', name: 'Sofia', voice_id: 'sofia_v1', user_id: 'mock-user-id', status: 'cancelling', created_at: new Date(Date.now() - 3600000 * 48).toISOString(), valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() },
      { id: '4', name: 'Expired Agent', voice_id: 'jessica_v4', user_id: 'mock-user-id', status: 'cancelling', created_at: new Date(Date.now() - 3600000 * 72).toISOString(), valid_until: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
    ];
    localStorage.setItem('ellevux_agents', JSON.stringify(mockAgents));
  }
  if (!localStorage.getItem('ellevux_calls')) {
    // Seed some mock calls
    const mockCalls = [
      { id: '1', created_at: new Date(Date.now() - 3600000 * 3).toISOString(), user_id: 'mock-user-id', agent_id: '1', caller_name: 'John Doe', caller_number: '+1 (555) 234-5678', duration_seconds: 124, status: 'completed', job_booked: true, summary: 'Inquired about plumbing services and scheduled a maintenance visit for next Tuesday.' },
      { id: '2', created_at: new Date(Date.now() - 3600000 * 5).toISOString(), user_id: 'mock-user-id', agent_id: '2', caller_name: 'Sarah Smith', caller_number: '+1 (555) 987-6543', duration_seconds: 85, status: 'completed', job_booked: false, summary: 'Asked about pricing plans for heating installation. Provided base estimates.' },
      { id: '3', created_at: new Date(Date.now() - 3600000 * 12).toISOString(), user_id: 'mock-user-id', agent_id: '1', caller_name: 'Unknown Caller', caller_number: '+1 (555) 456-7890', duration_seconds: 0, status: 'missed', job_booked: false, summary: 'Call was missed. No voice message left.' }
    ];
    localStorage.setItem('ellevux_calls', JSON.stringify(mockCalls));
  }

  // Define Mock client
  const mockAuth = {
    listeners: [],
    onAuthStateChange(callback) {
      this.listeners.push(callback);
      // Immediately call with current session
      const session = this.getCurrentSession();
      setTimeout(() => callback('SIGNED_IN', session), 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.listeners = this.listeners.filter(l => l !== callback);
            }
          }
        }
      };
    },
    getCurrentSession() {
      const raw = localStorage.getItem('ellevux_session');
      try {
        return raw && raw !== 'null' ? JSON.parse(raw) : null;
      } catch(e) {
        return null;
      }
    },
    async getSession() {
      return { data: { session: this.getCurrentSession() }, error: null };
    },
    async signUp({ email, password, options }) {
      const users = JSON.parse(localStorage.getItem('ellevux_users') || '[]');
      if (users.find(u => u.email === email)) {
        return { data: null, error: { message: "User already exists." } };
      }
      const user = {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        email,
        user_metadata: options?.data || {}
      };
      users.push({ ...user, password });
      localStorage.setItem('ellevux_users', JSON.stringify(users));
      
      // Auto sign in user upon signup
      const session = {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata
        }
      };
      localStorage.setItem('ellevux_session', JSON.stringify(session));
      this.listeners.forEach(l => l('SIGNED_IN', session));

      return { data: { user }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const users = JSON.parse(localStorage.getItem('ellevux_users') || '[]');
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        return { data: { session: null }, error: { message: "Invalid login credentials." } };
      }
      
      const session = {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata
        }
      };
      localStorage.setItem('ellevux_session', JSON.stringify(session));
      
      // Notify listeners
      this.listeners.forEach(l => l('SIGNED_IN', session));
      return { data: { session }, error: null };
    },
    async signInWithOAuth({ provider, options }) {
      if (provider !== 'google') {
        const session = {
          user: {
            id: 'user_oauth_' + Math.random().toString(36).substr(2, 9),
            email: 'oauthuser@example.com',
            user_metadata: { first_name: 'OAuth', last_name: 'User' }
          }
        };
        localStorage.setItem('ellevux_session', JSON.stringify(session));
        this.listeners.forEach(l => l('SIGNED_IN', session));
        window.location.href = options?.redirectTo || 'react_landing.html';
        return { data: { session }, error: null };
      }

      return new Promise((resolve) => {
        const modalContainer = document.createElement('div');
        modalContainer.id = 'mock-google-modal';
        modalContainer.style.cssText = `
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          color: #ffffff;
        `;

        modalContainer.innerHTML = `
          <div style="
            background: #0a0a0a;
            border: 1px solid #1f1f1f;
            width: 100%;
            max-w: 400px;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            position: relative;
          ">
            <button id="mock-close-btn" style="
              position: absolute;
              top: 16px;
              right: 16px;
              background: transparent;
              border: none;
              color: #888888;
              cursor: pointer;
              font-size: 20px;
            ">&times;</button>
            <div style="text-align: center; margin-bottom: 24px;">
              <svg style="width: 40px; height: 40px; margin: 0 auto 12px;" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.111 4.113-3.418 0-6.195-2.777-6.195-6.195s2.777-6.195 6.195-6.195c1.528 0 2.923.556 4.004 1.48l3.155-3.155C19.23 1.956 15.86 1 12.015 1 5.931 1 12.015 5.931 12.015 23.03c5.856 0 10.9-4.218 10.9-11.015 0-.668-.07-1.285-.175-1.73H12.24z"/>
              </svg>
              <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 4px; color: #fff;">Sign in with Google</h2>
              <p style="font-size: 13px; color: #888; margin: 0;">to continue to <span style="color: #fff; font-weight: 600;">Ellevux</span></p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
              <button class="google-acc-btn" data-email="yuvrajsinghgill5492@gmail.com" data-first="Yuvraj" data-last="Singh Gill" data-company="Gill & Co." style="
                background: #111;
                border: 1px solid #1f1f1f;
                border-radius: 8px;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s;
                width: 100%;
              ">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #4169e1; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; color: #fff;">Y</div>
                <div style="flex: 1;">
                  <div style="font-size: 13px; font-weight: 600; color: #fff;">Yuvraj Singh Gill</div>
                  <div style="font-size: 11px; color: #888;">yuvrajsinghgill5492@gmail.com</div>
                </div>
                <div style="font-size: 9px; background: rgba(39, 201, 63, 0.1); color: #27c93f; border: 1px solid rgba(39, 201, 63, 0.2); padding: 2px 6px; border-radius: 99px; font-weight: bold;">TEST ACCT</div>
              </button>

              <button class="google-acc-btn" data-email="googleuser@example.com" data-first="Google" data-last="User" data-company="Google Inc." style="
                background: #111;
                border: 1px solid #1f1f1f;
                border-radius: 8px;
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s;
                width: 100%;
              ">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #8a2be2; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; color: #fff;">G</div>
                <div>
                  <div style="font-size: 13px; font-weight: 600; color: #fff;">Google User</div>
                  <div style="font-size: 11px; color: #888;">googleuser@example.com</div>
                </div>
              </button>
            </div>

            <div style="border-top: 1px solid #1f1f1f; padding-top: 16px; display: flex; flex-direction: column; gap: 12px;">
              <div style="font-size: 11px; color: #888; text-align: center;">Or sign in with custom account:</div>
              <div style="display: flex; gap: 8px;">
                <input type="email" id="custom-email" placeholder="enter-email@gmail.com" style="
                  flex: 1;
                  background: #000;
                  border: 1px solid #1f1f1f;
                  border-radius: 6px;
                  padding: 8px 12px;
                  font-size: 12px;
                  color: #fff;
                  outline: none;
                ">
                <button id="custom-submit-btn" style="
                  background: #fff;
                  color: #000;
                  border: none;
                  border-radius: 6px;
                  padding: 8px 16px;
                  font-size: 12px;
                  font-weight: bold;
                  cursor: pointer;
                ">Go</button>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(modalContainer);

        const buttons = modalContainer.querySelectorAll('.google-acc-btn');
        buttons.forEach(btn => {
          btn.addEventListener('mouseenter', () => btn.style.background = '#181818');
          btn.addEventListener('mouseleave', () => btn.style.background = '#111');
          
          btn.addEventListener('click', () => {
            const email = btn.getAttribute('data-email');
            const firstName = btn.getAttribute('data-first');
            const lastName = btn.getAttribute('data-last');
            const companyName = btn.getAttribute('data-company');
            completeAuth(email, firstName, lastName, companyName);
          });
        });

        const closeBtn = modalContainer.querySelector('#mock-close-btn');
        closeBtn.addEventListener('click', () => {
          document.body.removeChild(modalContainer);
          resolve({ data: null, error: { message: "Auth flow cancelled by user." } });
        });

        const customEmailInput = modalContainer.querySelector('#custom-email');
        const customSubmitBtn = modalContainer.querySelector('#custom-submit-btn');

        customSubmitBtn.addEventListener('click', () => {
          const email = customEmailInput.value.trim();
          if (!email || !email.includes('@')) {
            alert('Please enter a valid email address.');
            return;
          }
          const username = email.split('@')[0];
          const firstName = username.charAt(0).toUpperCase() + username.slice(1);
          completeAuth(email, firstName, 'Google', firstName + ' LLC');
        });

        function completeAuth(email, first, last, company) {
          const session = {
            user: {
              id: 'user_oauth_' + Math.random().toString(36).substr(2, 9),
              email: email,
              user_metadata: {
                first_name: first,
                last_name: last,
                company_name: company
              }
            }
          };

          localStorage.setItem('ellevux_session', JSON.stringify(session));
          
          const users = JSON.parse(localStorage.getItem('ellevux_users') || '[]');
          if (!users.find(u => u.email === email)) {
            users.push({
              id: session.user.id,
              email: email,
              user_metadata: session.user.user_metadata,
              password: 'oauth_dummy_password'
            });
            localStorage.setItem('ellevux_users', JSON.stringify(users));
          }

          if (window.supabaseClient && window.supabaseClient.auth && window.supabaseClient.auth.listeners) {
            window.supabaseClient.auth.listeners.forEach(l => l('SIGNED_IN', session));
          }
          
          document.body.removeChild(modalContainer);
          
          let target = options?.redirectTo || 'dashboard.html';
          window.location.href = target;
          
          resolve({ data: { session }, error: null });
        }
      });
    },
    async signOut() {
      localStorage.setItem('ellevux_session', 'null');
      this.listeners.forEach(l => l('SIGNED_OUT', null));
      window.location.href = 'react_landing.html';
      return { error: null };
    }
  };

  class MockQueryBuilder {
    constructor(tableName) {
      this.tableName = tableName;
      this.filters = [];
      this.orderCol = null;
      this.orderAsc = true;
      this.countOnly = false;
      this.action = 'select'; // default action
      this.insertRecords = null;
      this.updateValues = null;
    }
    
    eq(col, val) {
      this.filters.push({ type: 'eq', col, val });
      return this;
    }
    
    order(col, { ascending = true } = {}) {
      this.orderCol = col;
      this.orderAsc = ascending;
      return this;
    }
    
    select(columns, options) {
      this.action = 'select';
      if (options?.count === 'exact' && options?.head === true) {
        this.countOnly = true;
      }
      return this;
    }

    insert(records) {
      this.action = 'insert';
      this.insertRecords = records;
      return this;
    }

    update(updates) {
      this.action = 'update';
      this.updateValues = updates;
      return this;
    }

    delete() {
      this.action = 'delete';
      return this;
    }
    
    async then(resolve) {
      try {
        if (this.action === 'select') {
          const rawData = localStorage.getItem('ellevux_' + this.tableName) || '[]';
          let data = JSON.parse(rawData);
          
          // Filter
          for (const filter of this.filters) {
            if (filter.type === 'eq') {
              data = data.filter(item => item[filter.col] === filter.val);
            }
          }
          
          // Order
          if (this.orderCol) {
            data.sort((a, b) => {
              const valA = a[this.orderCol];
              const valB = b[this.orderCol];
              if (valA < valB) return this.orderAsc ? -1 : 1;
              if (valA > valB) return this.orderAsc ? 1 : -1;
              return 0;
            });
          }
          
          if (this.countOnly) {
            resolve({ count: data.length, data: null, error: null });
          } else {
            resolve({ data, count: data.length, error: null });
          }
        } 
        else if (this.action === 'insert') {
          const rawData = localStorage.getItem('ellevux_' + this.tableName) || '[]';
          const data = JSON.parse(rawData);
          
          const session = JSON.parse(localStorage.getItem('ellevux_session') || '{}');
          const userId = session?.user?.id || 'mock-user-id';
          
          const newRecords = (Array.isArray(this.insertRecords) ? this.insertRecords : [this.insertRecords]).map(r => ({
            id: Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            user_id: userId,
            ...r
          }));
          
          data.push(...newRecords);
          localStorage.setItem('ellevux_' + this.tableName, JSON.stringify(data));
          resolve({ data: newRecords, error: null });
        } 
        else if (this.action === 'update') {
          const rawData = localStorage.getItem('ellevux_' + this.tableName) || '[]';
          let data = JSON.parse(rawData);
          
          data = data.map(item => {
            let matches = true;
            for (const filter of this.filters) {
              if (filter.type === 'eq' && item[filter.col] !== filter.val) {
                matches = false;
              }
            }
            if (matches) {
              return { ...item, ...this.updateValues };
            }
            return item;
          });
          
          localStorage.setItem('ellevux_' + this.tableName, JSON.stringify(data));
          resolve({ data: null, error: null });
        } 
        else if (this.action === 'delete') {
          const rawData = localStorage.getItem('ellevux_' + this.tableName) || '[]';
          let data = JSON.parse(rawData);
          
          data = data.filter(item => {
            let matches = true;
            for (const filter of this.filters) {
              if (filter.type === 'eq' && item[filter.col] !== filter.val) {
                matches = false;
              }
            }
            return !matches;
          });
          
          localStorage.setItem('ellevux_' + this.tableName, JSON.stringify(data));
          resolve({ data: null, error: null });
        }
      } catch (error) {
        resolve({ data: null, count: 0, error: { message: error.message } });
      }
    }
  }

  _supabase = {
    auth: mockAuth,
    from(tableName) {
      return new MockQueryBuilder(tableName);
    }
  };
} else {
  // Use real Supabase client
  const { createClient } = supabase;
  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

window.supabaseClient = _supabase;

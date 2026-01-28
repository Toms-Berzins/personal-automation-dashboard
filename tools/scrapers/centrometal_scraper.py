"""
Centrometal PelTec Lambda Heater Data Scraper

A lightweight Python scraper that fetches real-time heater data from the Centrometal portal
and saves it to the PostgreSQL database.

Usage:
    python tools/scrapers/centrometal_scraper.py

Environment Variables Required:
    CENTROMETAL_USERNAME
    CENTROMETAL_PASSWORD
    CENTROMETAL_INSTALLATION_ID
    DATABASE_URL (PostgreSQL connection string)
"""

import os
import sys
import requests
import json
from datetime import datetime
from dotenv import load_dotenv
import psycopg

# Load environment variables
load_dotenv()

# Configuration
PORTAL_URL = os.getenv('CENTROMETAL_PORTAL_URL', 'https://www.portal.centrometal.hr')
LOGIN_URL = f"{PORTAL_URL}/login_check"
INSTALLATION_ID = os.getenv('CENTROMETAL_INSTALLATION_ID', '56F0C163')
DATABASE_URL = os.getenv('DATABASE_URL')

# Session management
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json;charset=UTF-8'
})


class CentrometalScraper:
    """Scraper for Centrometal heater data"""

    def __init__(self):
        self.username = os.getenv('CENTROMETAL_USERNAME')
        self.password = os.getenv('CENTROMETAL_PASSWORD')
        self.installation_db_id = None  # Will be discovered
        self.logged_in = False

        if not self.username or not self.password:
            raise ValueError("Missing CENTROMETAL_USERNAME or CENTROMETAL_PASSWORD in .env")

    def login(self):
        """Login to Centrometal portal and establish session"""
        print('[*] Logging in to Centrometal portal...')

        try:
            # Form data for login (discovered from debug script)
            login_data = {
                '_username': self.username,
                '_password': self.password,
                '_remember_me': 'on'
            }

            response = session.post(
                LOGIN_URL,
                data=login_data,  # Use form data, not JSON
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Referer': f'{PORTAL_URL}/login'
                },
                allow_redirects=True
            )

            # Check if login was successful by looking for session cookie
            if 'PHPSESSID' in session.cookies:
                self.logged_in = True
                print(f'[OK] Login successful! Session: {session.cookies.get("PHPSESSID")[:10]}...')
                return True
            else:
                print(f'[ERR] Login failed - no session cookie. Status: {response.status_code}')
                return False

        except Exception as e:
            print(f'[ERR] Login error: {e}')
            return False

    def load_dashboard(self):
        """Load the dashboard page to establish session state"""
        print('[*] Loading dashboard to establish session...')

        try:
            dashboard_url = f'{PORTAL_URL}/#/widgetsgrid'
            response = session.get(dashboard_url, timeout=10)

            if response.status_code == 200:
                print('[OK] Dashboard loaded successfully')
                return True
            else:
                print(f'[WARN] Dashboard returned status {response.status_code}')
                return False

        except Exception as e:
            print(f'[WARN] Error loading dashboard: {e}')
            return False

    def discover_installation_db_id(self):
        """Discover the database ID for the installation"""
        print(f'[*] Discovering database ID for installation {INSTALLATION_ID}...')

        try:
            # Try to get installation autocomplete data
            response = session.post(
                f'{PORTAL_URL}/data/autocomplete/installation',
                json={},
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                # Search for our installation ID in the response
                for item in data:
                    if item.get('serial') == INSTALLATION_ID:
                        self.installation_db_id = item.get('id')
                        print(f'[OK] Found database ID: {self.installation_db_id}')
                        return self.installation_db_id

            # Fallback: Use hardcoded value discovered from debug
            self.installation_db_id = 4210
            print(f'[WARN]  Using fallback database ID: {self.installation_db_id}')
            return self.installation_db_id

        except Exception as e:
            print(f'[WARN]  Error discovering ID: {e}, using fallback')
            self.installation_db_id = 4210
            return self.installation_db_id

    def fetch_temperature_data(self):
        """Fetch real-time temperature and status data"""
        print('[*]  Fetching temperature data...')

        if not self.installation_db_id:
            self.discover_installation_db_id()

        try:
            response = session.post(
                f'{PORTAL_URL}/api/inst/control/multiple',
                json={},
                headers={
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json;charset=UTF-8',
                    'Referer': f'{PORTAL_URL}/',
                },
                timeout=10
            )

            if response.status_code == 200:
                print(f'[DEBUG] Response content: {response.text[:200]}')
                if not response.text:
                    print('[WARN] Empty response body')
                    return None

                data = response.json()

                # Parse the Google Charts format returned
                if 'rows' in data and len(data['rows']) > 0:
                    latest_row = data['rows'][-1]  # Get most recent data

                    # Columns are: timestamp, boiler_temp, flue_gas_temp, return_temp, dhw_temp
                    return {
                        'timestamp': latest_row[0],
                        'boiler_temperature': float(latest_row[1]) if latest_row[1] else None,
                        'flue_gas_temperature': float(latest_row[2]) if latest_row[2] else None,
                        'return_temperature': float(latest_row[3]) if latest_row[3] else None,
                        'dhw_temperature': float(latest_row[4]) if latest_row[4] else None,
                    }

            print(f'[WARN]  Temperature fetch returned status {response.status_code}')
            return None

        except Exception as e:
            print(f'[ERR] Error fetching temperature data: {e}')
            return None

    def fetch_parameter_list(self):
        """Fetch detailed parameter list including all sensors"""
        print('[*] Fetching parameter list...')

        try:
            response = session.get(
                f'{PORTAL_URL}/wdata/data/parameter-list/{INSTALLATION_ID}',
                headers={
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': f'{PORTAL_URL}/',
                },
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                print(f'[OK] Retrieved {len(data.get("parameters", []))} parameter groups')
                return data

            print(f'[WARN]  Parameter list fetch returned status {response.status_code}')
            return None

        except Exception as e:
            print(f'[ERR] Error fetching parameters: {e}')
            return None

    def fetch_errors(self):
        """Fetch error/event list"""
        print('[WARN]  Fetching error list...')

        if not self.installation_db_id:
            self.discover_installation_db_id()

        try:
            response = session.post(
                f'{PORTAL_URL}/wdata/data/multi/errors-list/{self.installation_db_id}',
                json={},
                headers={
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json;charset=UTF-8',
                    'Referer': f'{PORTAL_URL}/',
                },
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                if 'rows' in data and len(data['rows']) > 0:
                    print(f'[OK] Found {len(data["rows"])} events')
                    return data
                else:
                    print('[OK] No errors found (good!)')
                    return None

            return None

        except Exception as e:
            print(f'[ERR] Error fetching errors: {e}')
            return None

    def save_to_database(self, heater_data):
        """Save heater data to PostgreSQL database"""
        print('[*] Saving to database...')

        if not DATABASE_URL:
            print('[WARN]  DATABASE_URL not set, skipping database save')
            return False

        try:
            with psycopg.connect(DATABASE_URL) as conn:
                with conn.cursor() as cursor:
                    # Insert heater status
                    query = """
                        INSERT INTO heater_status (
                            state, is_live,
                            main_temperature, supply_temperature, return_temperature,
                            dhw_temperature,
                            configuration_type, installation_id
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s
                        ) RETURNING id
                    """

                    values = (
                        heater_data.get('state', 'UNKNOWN'),
                        True,  # is_live
                        heater_data.get('boiler_temperature'),
                        heater_data.get('flue_gas_temperature'),
                        heater_data.get('return_temperature'),
                        heater_data.get('dhw_temperature'),
                        heater_data.get('database_id'),  # configuration_type (INTEGER)
                        INSTALLATION_ID  # installation_id (string)
                    )

                    cursor.execute(query, values)
                    record_id = cursor.fetchone()[0]

                    conn.commit()

            print(f'[OK] Saved to database (ID: {record_id})')
            return True

        except Exception as e:
            print(f'[ERR] Database error: {e}')
            return False

    def scrape(self):
        """Main scraping function"""
        print('[*] Starting Centrometal heater scraper...\n')

        # Step 1: Login
        if not self.login():
            print('[ERR] Scraping failed - login unsuccessful')
            return None

        # Step 2: Load dashboard (required for API access)
        self.load_dashboard()

        # Step 3: Discover installation database ID
        self.discover_installation_db_id()

        # Step 4: Fetch data
        temp_data = self.fetch_temperature_data()
        param_data = self.fetch_parameter_list()
        error_data = self.fetch_errors()

        # Combine data
        heater_data = {
            'timestamp': datetime.now().isoformat(),
            'installation_id': INSTALLATION_ID,
            'database_id': self.installation_db_id,
        }

        if temp_data:
            heater_data.update(temp_data)

        # Step 5: Save to database
        if heater_data:
            self.save_to_database(heater_data)

            print('\n[OK] Scraping completed successfully!')
            print(f'[*] Data: {json.dumps(heater_data, indent=2, default=str)}')
            return heater_data
        else:
            print('[ERR] No data retrieved')
            return None


def main():
    """Main entry point"""
    try:
        scraper = CentrometalScraper()
        data = scraper.scrape()

        if data:
            sys.exit(0)  # Success
        else:
            sys.exit(1)  # Failure

    except Exception as e:
        print(f'[ERR] Fatal error: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()

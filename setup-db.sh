#!/bin/bash

# Total Neutron Database Setup Shell Script
# Runs the schema.sql against the local MariaDB server using the database password 'my1p@ssw0rd'

# Check if running as root or has sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "\033[0;31mWarning: You may need root/sudo permissions to connect to MariaDB.\033[0m"
fi

echo -e "\033[0;33mInitializing database schema and seeding user data...\033[0m"

# Execute schema.sql using inline password authorization
mysql -u root -p'my1p@ssw0rd' < server/schema.sql

if [ $? -eq 0 ]; then
  echo -e "\033[0;32mDatabase tn_claims successfully created, configured, and seeded!\033[0m"
  echo -e "Credentials ready:"
  echo -e "  Admin: admin@neutron.com | Password: my1p@ssw0rd"
  echo -e "  Staff: staff@neutron.com | Password: my1p@ssw0rd"
else
  echo -e "\033[0;31mError: Failed to execute database script. Please verify MariaDB is running.\033[0m"
fi

#!/bin/bash

# Color Codes
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print messages
print_info() {
    echo -e "${BLUE}INFO: $1${NC}"
}

print_success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

print_error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
}

print_question() {
    echo -e "${CYAN}Q: $1${NC}"
}

# --- Script Start ---
echo -e "${GREEN}**********************************************${NC}"
echo -e "${GREEN}*   Userscript Project Generator by Gemini   *${NC}"
echo -e "${GREEN}**********************************************${NC}"
echo

print_info "This script will help you create a new userscript project."
print_info "It will copy a template and customize it based on your input."
echo

# --- Gather Project Information ---
print_question "Enter the name for your new userscript (e.g., 'My Awesome Script'):"
read -r project_display_name
while [ -z "$project_display_name" ]; do
    print_error "Project name cannot be empty. Please try again."
    print_question "Enter the name for your new userscript (e.g., 'My Awesome Script'):"
    read -r project_display_name
done

# Convert display name to kebab-case for directory/file names
project_name_kebab=$(echo "$project_display_name" | tr '[:upper:]' '[:lower:]' | sed -E -e 's/[^a-z0-9_]+/-/g' -e 's/^-+|-+$//g' -e 's/-+/-/g')

print_info "Project directory and file prefix will be: ${YELLOW}$project_name_kebab${NC}"
echo

print_question "Enter a short description for your userscript:"
read -r project_description
while [ -z "$project_description" ]; do
    print_error "Project description cannot be empty. Please try again."
    print_question "Enter a short description for your userscript:"
    read -r project_description
done
echo

print_question "Enter the author's name (default: Batur Kacamak):"
read -r author_name
author_name=${author_name:-"Batur Kacamak"}
echo

print_question "Enter author's homepage/contact URL (default: https://batur.info/):"
read -r author_homepage
author_homepage=${author_homepage:-"https://batur.info/"}
echo

print_question "Enter the initial version (default: 0.1.0):"
read -r version
version=${version:-"0.1.0"}
echo

print_question "Enter the @match pattern for the target website (e.g., 'https://*.example.com/*'). For multiple, comma-separate:"
read -r match_patterns_input
while [ -z "$match_patterns_input" ]; do
    print_error "Match pattern(s) cannot be empty. Please try again."
    print_question "Enter the @match pattern for the target website (e.g., 'https://*.example.com/*'). For multiple, comma-separate:"
    read -r match_patterns_input
done
echo

print_question "Enter the URL for the website's favicon (for @icon, optional, press Enter to skip):"
read -r icon_url
echo

print_question "Enter any required GM_ grants (comma-separated, e.g., 'GM_setValue,GM_getValue', press Enter for defaults):"
read -r gm_grants_input
gm_grants_input=${gm_grants_input:-"GM_addStyle, GM_xmlhttpRequest, GM_setValue, GM_getValue"} # Default grants
echo

# --- Helper function to convert comma-separated string to JSON array string ---
# Input: "val1, val2, val3"
# Output: "\\"val1\\", \\"val2\\", \\"val3\\""
comma_separated_to_json_array_string() {
    local input_string="$1"
    local output_string=""
    IFS=',' read -ra ADDR <<< "$input_string"
    for i in "${ADDR[@]}"; do
        # Trim whitespace
        trimmed_item=$(echo "$i" | sed -e 's/^ *//;s/ *$//')
        if [ -n "$output_string" ]; then
            output_string="$output_string, "
        fi
        output_string="$output_string\\"$trimmed_item\\""
    done
    echo "$output_string"
}

# --- Helper function to convert comma-separated string to UserScript header lines ---
# Input: "val1, val2, val3"
# Output:
# // @grant        val1
# // @grant        val2
# // @grant        val3
comma_separated_to_userscript_header_lines() {
    local input_string="$1"
    local prefix="$2" # e.g., "// @grant        " or "// @match        "
    local output_string=""
    IFS=',' read -ra ADDR <<< "$input_string"
    for i in "${ADDR[@]}"; do
        # Trim whitespace
        trimmed_item=$(echo "$i" | sed -e 's/^ *//;s/ *$//')
        if [ -n "$output_string" ]; then
            output_string="$output_string\\n" # Newline for sed
        fi
        output_string="$output_string$prefix$trimmed_item"
    done
    echo "$output_string"
}

# --- Confirmation ---
echo -e "${YELLOW}--- Confirmation ---${NC}"
echo "Project Display Name: ${project_display_name}"
echo "Project Kebab Name:   ${project_name_kebab}"
echo "Description:          ${project_description}"
echo "Author:               ${author_name}"
echo "Author Homepage:      ${author_homepage}"
echo "Version:              ${version}"
echo "Match Patterns:       ${match_patterns_input}"
echo "Icon URL:             ${icon_url:-"(none)"}"
echo "GM Grants:            ${gm_grants_input}"
echo

print_question "Is the above information correct? (yes/no)"
read -r confirmation

if [[ "$confirmation" != "yes" && "$confirmation" != "y" ]]; then
    print_warning "Operation cancelled by user."
    exit 0
fi

print_success "Proceeding with project creation..."

# --- Define Directories and Names ---
SCRIPT_DIR="$(dirname "$0")" # Get the directory where the script is located
TEMPLATE_DIR="${SCRIPT_DIR}/_userscript-template"
NEW_PROJECT_DIR="./userscripts/${project_name_kebab}" # Create in userscripts/ relative to CWD (assumed project root)

# --- Check if template directory exists ---
if [ ! -d "$TEMPLATE_DIR" ]; then
    print_error "Template directory '${TEMPLATE_DIR}' not found. Please ensure it exists."
    exit 1
fi

# --- Check if project directory already exists ---
if [ -d "$NEW_PROJECT_DIR" ]; then
    print_warning "Project directory '${NEW_PROJECT_DIR}' already exists."
    print_question "Do you want to overwrite it? (yes/no)"
    read -r overwrite_confirmation
    if [[ "$overwrite_confirmation" != "yes" && "$overwrite_confirmation" != "y" ]]; then
        print_warning "Operation cancelled. Please choose a different project name or remove the existing directory."
        exit 0
    else
        print_info "Overwriting existing directory: ${NEW_PROJECT_DIR}"
        rm -rf "$NEW_PROJECT_DIR"
    fi
fi

# --- Create Project Directory ---
mkdir -p "$NEW_PROJECT_DIR"
if [ $? -ne 0 ]; then
    print_error "Failed to create project directory: ${NEW_PROJECT_DIR}"
    exit 1
fi
print_success "Created project directory: ${NEW_PROJECT_DIR}"

# --- Copy Template Files ---
cp -r "${TEMPLATE_DIR}/"* "${NEW_PROJECT_DIR}/"
if [ $? -ne 0 ]; then
    print_error "Failed to copy template files to ${NEW_PROJECT_DIR}"
    # Attempt to clean up created directory
    rm -rf "$NEW_PROJECT_DIR"
    exit 1
fi
print_success "Copied template files to ${NEW_PROJECT_DIR}"

# --- Rename Generic Files ---
mv "${NEW_PROJECT_DIR}/template.user.js" "${NEW_PROJECT_DIR}/${project_name_kebab}.user.js"
# No longer move template.js as it does not exist in the template.
# Instead, create a new, empty or minimal JS file:
echo "// Main JavaScript file for ${project_display_name}\n// You can write your core script logic here, or link to it from the .user.js file." > "${NEW_PROJECT_DIR}/${project_name_kebab}.js"

print_success "Renamed/created script files."

# --- Prepare Placeholder Values ---
# For meta.json URLs
NAMESPACE_URL="https://github.com/baturkacamak/userscripts" # Assuming this is constant
SUPPORT_URL_BASE="https://github.com/baturkacamak/userscripts/issues" # Standard issues page
HOMEPAGE_URL_BASE="https://github.com/baturkacamak/userscripts/tree/master"
DOWNLOAD_URL_BASE="https://github.com/baturkacamak/userscripts/raw/master"

# For README.md dates
CURRENT_YEAR=$(date +%Y)
CURRENT_DATE_YYYY_MM_DD=$(date +%F)

# Convert match patterns and grants for JSON and UserScript header
MATCH_PATTERNS_JSON_ARRAY_STR=$(comma_separated_to_json_array_string "$match_patterns_input")
GM_GRANTS_JSON_ARRAY_STR=$(comma_separated_to_json_array_string "$gm_grants_input")

MATCH_PATTERNS_USERSCRIPT_HEADER_STR=$(comma_separated_to_userscript_header_lines "$match_patterns_input" "// @match        ")
GM_GRANTS_USERSCRIPT_HEADER_STR=$(comma_separated_to_userscript_header_lines "$gm_grants_input" "// @grant        ")

# --- File Processing Function ---
process_file() {
    local file_path="$1"
    print_info "Processing file: $file_path"

    # Create a temporary file for sed output
    local temp_file="${file_path}.tmp"

    # Use a different delimiter for sed like | or # if paths/values contain /
    # For simplicity, ensure placeholder keys are unique and don't clash with sed syntax
    sed -e "s|{{PROJECT_NAME_KEBAB}}|$project_name_kebab|g" \
        -e "s|{{PROJECT_NAME_TITLE}}|$project_display_name|g" \
        -e "s|{{PROJECT_DESCRIPTION}}|$project_description|g" \
        -e "s|{{AUTHOR_NAME}}|$author_name|g" \
        -e "s|{{AUTHOR_HOMEPAGE}}|$author_homepage|g" \
        -e "s|{{VERSION}}|$version|g" \
        -e "s|{{NAMESPACE_URL}}|$NAMESPACE_URL|g" \
        -e "s|{{SUPPORT_URL_BASE}}|$SUPPORT_URL_BASE|g" \
        -e "s|{{HOMEPAGE_URL_BASE}}|$HOMEPAGE_URL_BASE|g" \
        -e "s|{{DOWNLOAD_URL_BASE}}|$DOWNLOAD_URL_BASE|g" \
        -e "s|{{MATCH_PATTERNS_JSON_ARRAY}}|${MATCH_PATTERNS_JSON_ARRAY_STR}|g" \
        -e "s|{{GM_GRANTS_JSON_ARRAY}}|${GM_GRANTS_JSON_ARRAY_STR}|g" \
        -e "s|{{ICON_URL}}|$icon_url|g" \
        -e "s|{{CURRENT_YEAR}}|$CURRENT_YEAR|g" \
        -e "s|{{CURRENT_DATE_YYYY_MM_DD}}|$CURRENT_DATE_YYYY_MM_DD|g" \
        -e "s|{{MATCH_PATTERNS_USERSCRIPT_HEADER}}|${MATCH_PATTERNS_USERSCRIPT_HEADER_STR}|g" \
        -e "s|{{GM_GRANTS_USERSCRIPT_HEADER}}|${GM_GRANTS_USERSCRIPT_HEADER_STR}|g" \
        "$file_path" > "$temp_file"

    if [ $? -eq 0 ]; then
        mv "$temp_file" "$file_path"
        print_success "Successfully updated $file_path"
    else
        print_error "Failed to update $file_path. A backup might be at $temp_file"
        # rm "$temp_file" # Optionally remove temp file on error
    fi
}

# --- Process Files ---
process_file "${NEW_PROJECT_DIR}/meta.json"
process_file "${NEW_PROJECT_DIR}/README.md"
process_file "${NEW_PROJECT_DIR}/${project_name_kebab}.user.js"

# --- Update package.json (Optional) ---
PACKAGE_JSON_PATH="./package.json" # Assuming it's in the root of UserScripts
if [ -f "$PACKAGE_JSON_PATH" ]; then
    print_question "Found package.json. Do you want to add a build script for '${project_name_kebab}'? (yes/no)"
    read -r add_build_script_confirmation
    if [[ "$add_build_script_confirmation" == "yes" || "$add_build_script_confirmation" == "y" ]]; then
        # This is a simplified way to add to scripts.
        # It assumes "scripts": { ... } exists and adds a new line.
        # A more robust solution would use jq or a similar JSON processor.
        # Example build command: "webpack --config webpack.config.js --env scriptName=${project_name_kebab}"
        # The actual command depends on your build setup.
        # For now, we'll assume a convention like: "build:my-script": "echo \'Build my-script\'"
        # You'll need to adjust the actual build command.

        print_question "Enter the build command for this script (e.g., 'npm run build:common -- --scriptName=${project_name_kebab}'):"
        read -r build_command

        if [ -n "$build_command" ]; then
            # Attempt to add the script entry. This is a bit naive and might break JSON structure if not careful.
            # It looks for the "scripts": { line and inserts after it.
            # Using 'jq' is highly recommended for robust JSON manipulation.
            # Example using jq (if installed):
            # jq ".scripts += {\\"build:${project_name_kebab}\\": \\"${build_command}\\"}" package.json > package.json.tmp && mv package.json.tmp package.json
            
            # Simplified sed approach (less robust):
            # Check if "scripts" block ends with a comma
            if grep -q \'"scripts": {[^{}]*,\'$ "$PACKAGE_JSON_PATH"; then # if there are existing scripts with a trailing comma
                 sed -i "/\"scripts\": {/a \\    \"build:${project_name_kebab}\": \"${build_command//&/\\\\&}\"," "$PACKAGE_JSON_PATH"
            else # if "scripts" is empty or last script has no trailing comma
                 sed -i "/\"scripts\": {/a \\    \"build:${project_name_kebab}\": \"${build_command//&/\\\\&}\"" "$PACKAGE_JSON_PATH"
                 # And if there were previous entries, add a comma to the previous last one.
                 # This part is tricky with sed and highlights why jq is better.
                 # For simplicity, this example might require manual adjustment of the last comma in package.json's scripts block.
            fi
            # A safer sed approach: add the new script line, then try to ensure commas are okay (very basic)
            # This is still fragile.
            # sed -i "/\"scripts\": {/a \\    \"build:${project_name_kebab}\": \"${build_command//&/\\\\&}\"," "$PACKAGE_JSON_PATH"
            # sed -i '$!N;s/\\n    "[^"]*": "[^"]*"\\n  }/\\n    "[^"]*": "[^"]*"\\n  }/;P;D' "$PACKAGE_JSON_PATH" # Attempt to remove trailing comma if it's the last one. This regex is complex and error-prone.

            print_warning "Attempted to add build script. Please verify ${PACKAGE_JSON_PATH} manually. Using 'jq' is recommended for robust JSON updates."
            print_info "Example jq command: jq '.scripts += {\"build:${project_name_kebab}\": \"${build_command}\"}' ${PACKAGE_JSON_PATH} | sponge ${PACKAGE_JSON_PATH}"
            print_success "Build script for '${project_name_kebab}' potentially added. Check package.json."
        else
            print_warning "No build command entered. Skipping package.json update."
        fi
    fi
else
    print_warning "package.json not found at ${PACKAGE_JSON_PATH}. Skipping build script addition."
fi

echo
print_info "If you haven't already, you might need to update the placeholder markers in the template files:"
print_info "  - _userscript-template/meta.json"
print_info "  - _userscript-template/README.md"
print_info "  - _userscript-template/template.user.js"
print_info "Ensure they match the keys used in this script (e.g., {{PROJECT_NAME_KEBAB}}, {{PROJECT_DESCRIPTION}}, etc.)"
print_success "New userscript project '${project_display_name}' created successfully in '${NEW_PROJECT_DIR}'!"
print_info "Next steps:"
print_info "1. cd ${NEW_PROJECT_DIR}"
print_info "2. Review all files, especially ${project_name_kebab}.user.js, meta.json, and README.md."
print_info "3. Start coding your userscript logic in src/ and ${project_name_kebab}.js!"
print_info "4. If you added a build script, commit changes to package.json."

exit 0 
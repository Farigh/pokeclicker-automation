#! /bin/bash

# TODO (03/08/2022): Find a better way to resolve imports
# For now, importing files using node.js build-in will not work because
# imported symbols are not visible from the other imports

resolved_script_path=$(readlink -f "$0")
current_script_dir=$(dirname "${resolved_script_path}")
current_root_dir=$(dirname "${current_script_dir}")
current_root_path=$(readlink -e "${current_root_dir}")

# Styling
RED=$(echo -e '\e[31m')
PURPLE=$(echo -e '\e[35m')
CYAN=$(echo -e '\e[36m')
BOLD=$(echo -e '\e[1m')
RESET_FORMAT=$(echo -e '\e[0m')

# Make sure all imports exists
while read -r import_file; do
    if [ ! -f "${current_root_path}/${import_file}" ]; then
        echo "${RED}${BOLD}Error: import file '${PURPLE}${import_file}${RED}' does not exists${RESET_FORMAT}, from:"
        grep -riI --include "*.js" "^import \"${import_file}\";" -l
        echo ""
        exit 1
    fi
done < <(grep -hriI --include "*.js" '^import "[^"]*";' | sed 's#import "\([^"]*\)";.*#\1#' | sort -u)

# Copy the input files
while read -r input_file; do
    cp "${input_file}" "${input_file/.in.js/.js}"
done < <(find . -name "*.test.in.js" -type f)

# Resolve imports
while grep -nriI --include "*.test.js" '^import "[^"]*";' -q; do
    while read -r test_file; do
        awk -i inplace -vroot_dir="${current_root_path}/" '
            {
                if ($0 ~ /^import "[^"]*";/)
                {
                    file_name = root_dir gensub(/^import "([^"]*)";.*/, "\\1", 1, $0);
                    while ((getline line < file_name) > 0)
                    {
                        print line;
                    }
                    close(file_name);
                }
                else
                {
                    print $0;
                }
            }' "${test_file}"
    done < <(grep -nriI --include "*.test.js" '^import "[^"]*";' -l)
done

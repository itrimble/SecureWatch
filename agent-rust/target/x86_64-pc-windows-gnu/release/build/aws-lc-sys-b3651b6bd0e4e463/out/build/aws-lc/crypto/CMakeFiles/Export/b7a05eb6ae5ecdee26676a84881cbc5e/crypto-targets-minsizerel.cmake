#----------------------------------------------------------------
# Generated CMake target import file for configuration "MinSizeRel".
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "AWS::crypto" for configuration "MinSizeRel"
set_property(TARGET AWS::crypto APPEND PROPERTY IMPORTED_CONFIGURATIONS MINSIZEREL)
set_target_properties(AWS::crypto PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_MINSIZEREL "ASM_NASM;C"
  IMPORTED_LOCATION_MINSIZEREL "${_IMPORT_PREFIX}/lib/libaws_lc_0_29_0_crypto.a"
  )

list(APPEND _cmake_import_check_targets AWS::crypto )
list(APPEND _cmake_import_check_files_for_AWS::crypto "${_IMPORT_PREFIX}/lib/libaws_lc_0_29_0_crypto.a" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)

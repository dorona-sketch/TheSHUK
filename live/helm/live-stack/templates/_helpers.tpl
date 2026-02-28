{{- define "live-stack.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "live-stack.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

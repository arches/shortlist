# managing-my-list.scenarios.md: links on a restaurant are rendered as links, so
# what counts as one is a decision rather than a formality. shortlist.data.md
# fixes it: http or https only, at most 2048 characters.
class HttpUrlValidator < ActiveModel::EachValidator
  MAX_LENGTH = 2048
  SCHEMES = %w[http https].freeze
  MESSAGE = "must be a web address beginning http:// or https://".freeze

  def validate_each(record, attribute, value)
    return if value.blank?

    if value.length > MAX_LENGTH
      record.errors.add(attribute, :too_long, count: MAX_LENGTH)
      return
    end

    record.errors.add(attribute, MESSAGE) unless web_address?(value)
  end

  private
    def web_address?(value)
      uri = URI.parse(value)
      SCHEMES.include?(uri.scheme) && uri.host.present?
    rescue URI::InvalidURIError
      false
    end
end

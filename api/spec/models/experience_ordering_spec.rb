require "rails_helper"

# Derived from the three read-back scenarios in
# managing-experiences.scenarios.md. Background: today is 2026-10-27.
RSpec.describe "The order a restaurant's experiences read in" do
  let(:owner) { create(:user) }
  let(:restaurant) { create(:restaurant, user: owner, name: "Joe's Pizza") }

  around do |example|
    travel_to(Time.utc(2026, 10, 27, 12)) { example.run }
  end

  # recorded_at is what breaks a tie between two experiences on one day, so the
  # scenarios that do not turn on it still have to pin it down — otherwise every
  # row in a single test shares a timestamp and the tie breaks arbitrarily.
  def experience(occurred_on:, recorded_at:, rating: nil, notes: nil)
    create(
      :experience,
      restaurant: restaurant,
      user: owner,
      occurred_on: occurred_on,
      recorded_at: recorded_at,
      rating: rating,
      notes: notes
    )
  end

  def dates_in_order
    restaurant.experiences.most_recent_first.map(&:occurred_on)
  end

  # Scenario: Reading a restaurant's experiences back — "Most recent first."
  #
  # Written down in the reverse of the order they read in, on purpose: ordering
  # by recorded_at alone would pass this the wrong way round, so the pair of
  # columns the scope keeps apart is kept apart here too.
  it "reads the most recent first, by the day it happened" do
    experience(occurred_on: Date.new(2026, 10, 20), recorded_at: Time.utc(2026, 10, 26, 10))
    experience(occurred_on: Date.new(2026, 5, 2), recorded_at: Time.utc(2026, 10, 26, 11))
    experience(occurred_on: Date.new(2019, 6, 14), recorded_at: Time.utc(2026, 10, 26, 12))

    expect(dates_in_order).to eq([
      Date.new(2026, 10, 20),
      Date.new(2026, 5, 2),
      Date.new(2019, 6, 14)
    ])
  end

  # Scenario: Where an undated experience sits — "Undated experiences are shown
  # at the end." The undated one here was recorded between the other two, so a
  # fallback to recorded_at would wrongly put it in the middle.
  it "puts an undated experience at the end, however recently it was recorded" do
    experience(occurred_on: Date.new(2026, 10, 24), recorded_at: Time.utc(2026, 10, 24))
    experience(occurred_on: nil, recorded_at: Time.utc(2026, 10, 20), notes: "Queue out the door")
    experience(occurred_on: Date.new(2026, 5, 2), recorded_at: Time.utc(2026, 5, 2))

    expect(dates_in_order).to eq([ Date.new(2026, 10, 24), Date.new(2026, 5, 2), nil ])
  end

  # Scenario: Two experiences on one day, read back — "the one rated 2.5 reads
  # first". Same day, so the tie breaks on which was written down later.
  it "breaks a tie on one day with the one written down later" do
    experience(occurred_on: Date.new(2026, 10, 20), recorded_at: Time.utc(2026, 10, 20, 13), rating: 4)
    experience(occurred_on: Date.new(2026, 10, 20), recorded_at: Time.utc(2026, 10, 20, 21), rating: 2.5)

    ratings = restaurant.experiences.most_recent_first.map { |one| one.rating.to_f }

    expect(ratings).to eq([ 2.5, 4.0 ])
  end
end
